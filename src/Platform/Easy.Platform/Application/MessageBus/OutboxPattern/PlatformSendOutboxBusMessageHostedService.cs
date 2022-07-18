using Easy.Platform.Application.Context;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Hosting;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.Exceptions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Polly;

namespace Easy.Platform.Application.MessageBus.OutboxPattern
{
    public abstract class PlatformSendOutboxBusMessageHostedService : PlatformIntervalProcessHostedService
    {
        private bool isProcessing = false;
        private readonly IPlatformApplicationSettingContext applicationSettingContext;

        protected PlatformSendOutboxBusMessageHostedService(
            IHostApplicationLifetime applicationLifetime,
            ILoggerFactory loggerFactory,
            IServiceProvider serviceProvider,
            IPlatformApplicationSettingContext applicationSettingContext,
            PlatformOutboxConfig outboxConfig) : base(applicationLifetime, loggerFactory)
        {
            this.ServiceProvider = serviceProvider;
            this.applicationSettingContext = applicationSettingContext;
            OutboxConfig = outboxConfig;
        }

        public static bool MatchImplementation(ServiceDescriptor serviceDescriptor)
        {
            return MatchImplementation(serviceDescriptor.ImplementationType) ||
                   MatchImplementation(serviceDescriptor.ImplementationInstance?.GetType());
        }

        public static bool MatchImplementation(Type implementationType)
        {
            return implementationType?.IsAssignableTo(
                       typeof(PlatformSendOutboxBusMessageHostedService)) ==
                   true;
        }

        protected IServiceProvider ServiceProvider { get; }

        protected PlatformOutboxConfig OutboxConfig { get; }

        protected override async Task IntervalProcessAsync(CancellationToken cancellationToken)
        {
            if (!ApplicationStartedAndRunning || !HasOutboxEventBusMessageRepositoryRegistered() || isProcessing)
                return;

            isProcessing = true;

            try
            {
                // WHY: Retry in case of the db is not started, initiated or restarting
                await Policy.Handle<Exception>()
                    .WaitAndRetryAsync(
                        retryCount: ProcessSendMessageRetryCount(),
                        sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                        onRetry: (
                            ex,
                            timeSpan,
                            currentRetry,
                            ctx) =>
                        {
                            Logger.LogWarning(
                                ex,
                                $"Retry SendOutboxEventBusMessages {currentRetry} time(s) failed with error: {ex.Message}. [ApplicationName:{applicationSettingContext.ApplicationName}]. [ApplicationAssembly:{applicationSettingContext.ApplicationAssembly.FullName}]");
                        })
                    .ExecuteAndThrowFinalExceptionAsync(() => SendOutboxEventBusMessages(cancellationToken));
            }
            catch (Exception ex)
            {
                Logger.LogWarning(
                    ex,
                    $"SendOutboxEventBusMessages failed with error: {ex.Message}. [ApplicationName:{applicationSettingContext.ApplicationName}]. [ApplicationAssembly:{applicationSettingContext.ApplicationAssembly.FullName}]");
            }

            isProcessing = false;
        }

        protected virtual async Task SendOutboxEventBusMessages(CancellationToken cancellationToken)
        {
            do
            {
                var toHandleMessages = await PopToHandleOutboxEventBusMessages(cancellationToken);

                foreach (var toHandleMessage in toHandleMessages)
                {
                    using (var scope = ServiceProvider.CreateScope())
                    {
                        try
                        {
                            await SendMessageToBusAsync(
                                scope,
                                toHandleMessage,
                                OutboxConfig.RetryProcessFailedMessageInSecondsUnit,
                                cancellationToken);
                        }
                        catch (Exception e)
                        {
                            Logger.LogError(
                                e,
                                $"[PlatformSendOutboxEventBusMessageHostedService] Try to produce outbox message with Id:{toHandleMessage.Id} failed. Message Content:{PlatformJsonSerializer.Serialize(toHandleMessage)}");
                        }
                    }
                }
            } while (await IsAnyMessagesToHandleAsync());
        }

        protected async Task<bool> IsAnyMessagesToHandleAsync()
        {
            using (var scope = ServiceProvider.CreateScope())
            {
                using (var uow = scope.ServiceProvider.GetService<IUnitOfWorkManager>()!.Begin())
                {
                    var outboxEventBusMessageRepo =
                        scope.ServiceProvider.GetService<IPlatformOutboxBusMessageRepository>();

                    var result = await outboxEventBusMessageRepo!.AnyAsync(
                        PlatformOutboxBusMessage.ToHandleOutboxEventBusMessagesExpr(
                            MessageProcessingMaximumTimeInSeconds()));

                    return result;
                }
            }
        }

        protected virtual async Task SendMessageToBusAsync(
            IServiceScope scope,
            PlatformOutboxBusMessage toHandleOutboxMessage,
            double retryProcessFailedMessageInSecondsUnit,
            CancellationToken cancellationToken)
        {
            var outboxEventBusProducerHelper =
                scope.ServiceProvider.GetService<PlatformOutboxMessageBusProducerHelper>();
            var messageType = ResolveMessageType(toHandleOutboxMessage);

            using (var uow = scope.ServiceProvider.GetService<IUnitOfWorkManager>()!.Begin())
            {
                if (messageType != null && messageType.IsAssignableTo(typeof(IPlatformBusTrackableMessage)))
                {
                    var message = (IPlatformBusTrackableMessage)PlatformJsonSerializer.Deserialize(
                        toHandleOutboxMessage.JsonMessage,
                        messageType);

                    await outboxEventBusProducerHelper!.HandleSendingOutboxMessageAsync(
                        message,
                        toHandleOutboxMessage.RoutingKey,
                        isProcessingExistingOutboxMessage: true,
                        retryProcessFailedMessageInSecondsUnit,
                        cancellationToken);
                }
                else
                {
                    await outboxEventBusProducerHelper!.UpdateExistingOutboxMessageFailedAsync(
                        toHandleOutboxMessage.Id,
                        new Exception(
                            $"[{GetType().Name}] Error resolve outbox message type/or not assignable to {nameof(IPlatformBusTrackableMessage)} " +
                            $"[TypeName:{toHandleOutboxMessage.MessageTypeFullName}]. OutboxId:{toHandleOutboxMessage.Id}"),
                        retryProcessFailedMessageInSecondsUnit,
                        cancellationToken);
                }

                await uow.CompleteAsync(cancellationToken);
            }
        }

        protected async Task<List<PlatformOutboxBusMessage>> PopToHandleOutboxEventBusMessages(
            CancellationToken cancellationToken)
        {
            try
            {
                using (var scope = ServiceProvider.CreateScope())
                {
                    using (var uow = scope.ServiceProvider.GetService<IUnitOfWorkManager>()!.Begin())
                    {
                        var outboxEventBusMessageRepo =
                            scope.ServiceProvider.GetService<IPlatformOutboxBusMessageRepository>();

                        var toHandleMessages = outboxEventBusMessageRepo!.GetAllQuery()
                            .Where(
                                PlatformOutboxBusMessage.ToHandleOutboxEventBusMessagesExpr(
                                    MessageProcessingMaximumTimeInSeconds()))
                            .OrderBy(p => p.LastSendDate)
                            .Take(NumberOfProcessMessagesBatch())
                            .ToList();

                        toHandleMessages.ForEach(
                            p =>
                            {
                                p.SendStatus = PlatformOutboxBusMessage.SendStatuses.Processing;
                                p.LastSendDate = DateTime.UtcNow;
                            });

                        await outboxEventBusMessageRepo.UpdateManyAsync(
                            toHandleMessages,
                            cancellationToken: cancellationToken);

                        await uow.CompleteAsync(cancellationToken);

                        return toHandleMessages;
                    }
                }
            }
            catch (PlatformRowVersionConflictDomainException conflictDomainException)
            {
                Logger.LogWarning(
                    conflictDomainException,
                    "Some other producer instance has been handling some outbox messages, which lead to row version conflict (support multi service instance running concurrently). This is as expected so just warning.");

                // WHY: Because support multi service instance running concurrently,
                // get row version conflict is expected, so just retry again to get unprocessed outbox messages
                return await PopToHandleOutboxEventBusMessages(cancellationToken);
            }
        }

        protected virtual int NumberOfProcessMessagesBatch()
        {
            return 1;
        }

        protected virtual int ProcessSendMessageRetryCount()
        {
            return 5;
        }

        /// <summary>
        /// To config how long a message can live in the database as Processing status in seconds. Default is 3600 seconds;
        /// This to handle that if message for some reason has been set as Processing but failed to process and has not been set back to failed.
        /// </summary>
        protected virtual double MessageProcessingMaximumTimeInSeconds()
        {
            return 3600;
        }

        protected bool HasOutboxEventBusMessageRepositoryRegistered()
        {
            using (var scope = ServiceProvider.CreateScope())
            {
                return scope.ServiceProvider.GetService<IPlatformOutboxBusMessageRepository>() != null;
            }
        }

        private Type ResolveMessageType(PlatformOutboxBusMessage toHandleOutboxMessage)
        {
            var messageType =
                Type.GetType(toHandleOutboxMessage.MessageTypeFullName, throwOnError: false) ??
                ServiceProvider
                    .GetService<IPlatformMessageBusManager>()!
                    .GetScanAssemblies()
                    .ConcatSingle(typeof(PlatformModule).Assembly)
                    .Select(assembly => assembly.GetType(toHandleOutboxMessage.MessageTypeFullName))
                    .FirstOrDefault(p => p != null);

            return messageType;
        }
    }

    public class PlatformDefaultSendOutboxBusMessageHostedService : PlatformSendOutboxBusMessageHostedService
    {
        public PlatformDefaultSendOutboxBusMessageHostedService(
            IHostApplicationLifetime applicationLifetime,
            ILoggerFactory loggerFactory,
            IServiceProvider serviceProvider,
            IPlatformApplicationSettingContext applicationSettingContext,
            PlatformOutboxConfig outboxConfig) : base(
            applicationLifetime,
            loggerFactory,
            serviceProvider,
            applicationSettingContext,
            outboxConfig)
        {
        }
    }
}
