using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.Context;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Hosting;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Timing;
using Easy.Platform.Common.Utils;
using Easy.Platform.Domain.Exceptions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Polly;

namespace Easy.Platform.Application.EventBus.InboxPattern
{
    public abstract class PlatformConsumeInboxEventBusMessageHostedService : PlatformIntervalProcessHostedService
    {
        private readonly IPlatformApplicationSettingContext applicationSettingContext;

        private bool isProcessing = false;

        protected PlatformConsumeInboxEventBusMessageHostedService(
            IHostApplicationLifetime applicationLifetime,
            ILoggerFactory loggerFactory,
            IServiceProvider serviceProvider,
            IPlatformApplicationSettingContext applicationSettingContext) : base(applicationLifetime, loggerFactory)
        {
            ServiceProvider = serviceProvider;
            this.applicationSettingContext = applicationSettingContext;
        }

        public static bool MatchImplementation(ServiceDescriptor serviceDescriptor)
        {
            return MatchImplementation(serviceDescriptor.ImplementationType) ||
                   MatchImplementation(serviceDescriptor.ImplementationInstance?.GetType());
        }

        public static bool MatchImplementation(Type implementationType)
        {
            return implementationType?.IsAssignableTo(
                typeof(PlatformConsumeInboxEventBusMessageHostedService)) == true;
        }

        public static Expression<Func<PlatformInboxEventBusMessage, bool>> ToHandleInboxEventBusMessagesExpr(
            double retryProcessFailedMessageDelayTimeInSeconds,
            double messageProcessingMaximumTimeInSeconds)
        {
            return p => p.ConsumeStatus == PlatformInboxEventBusMessage.ConsumeStatuses.New ||
                        (p.ConsumeStatus == PlatformInboxEventBusMessage.ConsumeStatuses.Failed && p.LastConsumeDate <= Clock.UtcNow.AddSeconds(-retryProcessFailedMessageDelayTimeInSeconds)) ||
                        (p.ConsumeStatus == PlatformInboxEventBusMessage.ConsumeStatuses.Processing && p.LastConsumeDate <= Clock.UtcNow.AddSeconds(-messageProcessingMaximumTimeInSeconds));
        }

        protected IServiceProvider ServiceProvider { get; }

        protected override async Task IntervalProcessAsync(CancellationToken cancellationToken)
        {
            if (!ApplicationStartedAndRunning || !HasInboxEventBusMessageRepositoryRegistered() || isProcessing)
                return;

            isProcessing = true;

            try
            {
                // Retry in case of the db is not started, initiated or restarting
                await Policy.Handle<Exception>()
                    .WaitAndRetryAsync(
                        retryCount: ProcessConsumeMessageRetryCount(),
                        sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                        onRetry: (ex, timeSpan, currentRetry, ctx) =>
                        {
                            Logger.LogWarning(
                                ex,
                                $"Retry ConsumeInboxEventBusMessages {currentRetry} time(s) failed with error: {ex.Message}. [ApplicationName:{applicationSettingContext.ApplicationName}]. [ApplicationAssembly:{applicationSettingContext.ApplicationAssembly.FullName}]");
                        })
                    .ExecuteAndThrowFinalExceptionAsync(() => ConsumeInboxEventBusMessages(cancellationToken));
            }
            catch (Exception ex)
            {
                Logger.LogError(
                    ex,
                    $"Retry ConsumeInboxEventBusMessages failed with error: {ex.Message}. [ApplicationName:{applicationSettingContext.ApplicationName}]. [ApplicationAssembly:{applicationSettingContext.ApplicationAssembly.FullName}]");
            }

            isProcessing = false;
        }

        protected virtual async Task ConsumeInboxEventBusMessages(CancellationToken cancellationToken)
        {
            do
            {
                var toHandleMessages = await PopToHandleInboxEventBusMessages(cancellationToken);

                foreach (var toHandleMessage in toHandleMessages)
                {
                    using (var scope = ServiceProvider.CreateScope())
                    {
                        try
                        {
                            await InvokeConsumerAsync(scope, toHandleMessage, cancellationToken);
                        }
                        catch (Exception e)
                        {
                            Logger.LogError(e, $"[PlatformConsumeInboxEventBusMessageHostedService] Try to consume inbox message with Id:{toHandleMessage.Id} failed. Message Content:{PlatformJsonSerializer.Serialize(toHandleMessage)}");
                        }
                    }
                }
            }
            while (await IsAnyMessagesToHandleAsync());
        }

        protected async Task<bool> IsAnyMessagesToHandleAsync()
        {
            using (var scope = ServiceProvider.CreateScope())
            {
                using (var uow = scope.ServiceProvider.GetService<IUnitOfWorkManager>()!.Begin())
                {
                    var inboxEventBusMessageRepo =
                        scope.ServiceProvider.GetService<IPlatformInboxEventBusMessageRepository>();

                    var result = await inboxEventBusMessageRepo!.AnyAsync(
                        ToHandleInboxEventBusMessagesExpr(
                            RetryProcessFailedMessageDelayTimeInSeconds(),
                            MessageProcessingMaximumTimeInSeconds()));

                    return result;
                }
            }
        }

        protected virtual async Task InvokeConsumerAsync(
            IServiceScope scope,
            PlatformInboxEventBusMessage toHandleInboxMessage,
            CancellationToken cancellationToken)
        {
            var consumerType = ResolveConsumerType(toHandleInboxMessage);

            if (consumerType != null)
            {
                var consumer = ((IPlatformInboxSupportEventBusConsumer)scope.ServiceProvider.GetService(consumerType))
                    !.ForProcessingExistingInboxMessage();

                // Get a generic type: PlatformEventBusMessage<TMessage> where TMessage = TMessagePayload
                // of IPlatformEventBusConsumer<TMessagePayload>
                var consumerMessageType = PlatformEventBusBaseConsumer.GetConsumerMessageType(consumer);

                var eventBusMessage = Util.Tasks.CatchExceptionContinueThrow(
                    () => PlatformJsonSerializer.Deserialize(
                        toHandleInboxMessage.JsonMessage,
                        consumerMessageType,
                        consumer.CustomJsonSerializerOptions()),
                    ex => Logger.LogError(
                        ex,
                        $"RabbitMQ parsing message to {consumerMessageType.Name} error for the routing key {toHandleInboxMessage.RoutingKey}.{Environment.NewLine} Body: {toHandleInboxMessage.JsonMessage}"));

                if (eventBusMessage != null)
                {
                    await PlatformEventBusBaseConsumer.InvokeConsumerAsync(
                        consumer,
                        eventBusMessage,
                        toHandleInboxMessage.RoutingKey,
                        IsLogConsumerProcessTime(),
                        LogErrorSlowProcessWarningTimeMilliseconds(),
                        Logger,
                        cancellationToken);
                }
            }
            else
            {
                await PlatformInboxEventBusConsumerHelper.UpdateFailedInboxMessageAsync(
                    toHandleInboxMessage.Id,
                    scope.ServiceProvider.GetService<IUnitOfWorkManager>(),
                    scope.ServiceProvider.GetService<IPlatformInboxEventBusMessageRepository>(),
                    new Exception($"[{GetType().Name}] Error resolve consumer type {toHandleInboxMessage.ConsumerBy}. InboxId:{toHandleInboxMessage.Id} "),
                    cancellationToken);
            }
        }

        protected async Task<List<PlatformInboxEventBusMessage>> PopToHandleInboxEventBusMessages(CancellationToken cancellationToken)
        {
            try
            {
                using (var scope = ServiceProvider.CreateScope())
                {
                    var uowManager = scope.ServiceProvider.GetService<IUnitOfWorkManager>();

                    using (var uow = uowManager!.Begin())
                    {
                        var inboxEventBusMessageRepo =
                            scope.ServiceProvider.GetService<IPlatformInboxEventBusMessageRepository>();

                        var toHandleMessages = inboxEventBusMessageRepo!.GetAllQuery()
                            .Where(ToHandleInboxEventBusMessagesExpr(
                                RetryProcessFailedMessageDelayTimeInSeconds(),
                                MessageProcessingMaximumTimeInSeconds()))
                            .OrderBy(p => p.LastConsumeDate)
                            .Take(NumberOfProcessMessagesBatch())
                            .ToList();

                        toHandleMessages.ForEach(p =>
                        {
                            p.ConsumeStatus = PlatformInboxEventBusMessage.ConsumeStatuses.Processing;
                            p.LastConsumeDate = DateTime.UtcNow;
                        });

                        await inboxEventBusMessageRepo.UpdateManyAsync(
                            toHandleMessages,
                            dismissSendEvent: true,
                            cancellationToken);

                        await uow.CompleteAsync(cancellationToken);

                        return toHandleMessages;
                    }
                }
            }
            catch (PlatformRowVersionConflictDomainException conflictDomainException)
            {
                Logger.LogWarning(conflictDomainException, "Some other consumer instance has been handling some inbox messages, which lead to row version conflict. This is as expected so just warning.");

                // Retry PopToHandleInboxEventBusMessages
                return await PopToHandleInboxEventBusMessages(cancellationToken);
            }
        }

        protected virtual int NumberOfProcessMessagesBatch()
        {
            return 1;
        }

        protected virtual int ProcessConsumeMessageRetryCount()
        {
            return 5;
        }

        /// <summary>
        /// To config how long a message can live in the database as Processing status in seconds. Default is 3600 * 24 seconds;
        /// This to handle that if message for some reason has been set as Processing but failed to process and has not been set back to failed.
        /// </summary>
        protected virtual double MessageProcessingMaximumTimeInSeconds()
        {
            return 3600 * 24;
        }

        /// <summary>
        /// Config the time to true to log consumer process time. Default is true
        /// </summary>
        protected virtual bool IsLogConsumerProcessTime()
        {
            return true;
        }

        /// <summary>
        /// Config the time in milliseconds to log warning if the process consumer time is over LogConsumerProcessWarningTimeMilliseconds. Default is 5000
        /// </summary>
        protected virtual double LogErrorSlowProcessWarningTimeMilliseconds()
        {
            return 5000;
        }

        /// <summary>
        /// Config the time in seconds to retry process failed message from lastConsumeDate. Default is 60
        /// </summary>
        protected virtual double RetryProcessFailedMessageDelayTimeInSeconds()
        {
            return 60;
        }

        protected bool HasInboxEventBusMessageRepositoryRegistered()
        {
            using (var scope = ServiceProvider.CreateScope())
            {
                return scope.ServiceProvider.GetService<IPlatformInboxEventBusMessageRepository>() != null;
            }
        }

        private Type ResolveConsumerType(PlatformInboxEventBusMessage toHandleInboxMessage)
        {
            var messageType =
                Type.GetType(toHandleInboxMessage.ConsumerBy, throwOnError: false) ??
                ServiceProvider
                    .GetService<IPlatformEventBusManager>()!
                    .GetScanAssemblies()
                    .ConcatSingle(typeof(PlatformModule).Assembly)
                    .Select(assembly => assembly.GetType(toHandleInboxMessage.ConsumerBy))
                    .FirstOrDefault(p => p != null);

            return messageType;
        }
    }

    public class PlatformDefaultConsumeInboxEventBusMessageHostedService : PlatformConsumeInboxEventBusMessageHostedService
    {
        public PlatformDefaultConsumeInboxEventBusMessageHostedService(
            IHostApplicationLifetime applicationLifetime,
            ILoggerFactory loggerFactory,
            IServiceProvider serviceProvider,
            IPlatformApplicationSettingContext applicationSettingContext) : base(applicationLifetime, loggerFactory, serviceProvider, applicationSettingContext)
        {
        }
    }
}
