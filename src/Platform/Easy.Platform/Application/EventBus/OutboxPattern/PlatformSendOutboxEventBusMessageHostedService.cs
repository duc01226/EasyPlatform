using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.Context;
using Easy.Platform.Application.EventBus.Producers;
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

namespace Easy.Platform.Application.EventBus.OutboxPattern
{
    public abstract class PlatformSendOutboxEventBusMessageHostedService : PlatformIntervalProcessHostedService
    {
        private bool isProcessing = false;
        private readonly IPlatformEventBusProducer eventBusProducer;
        private readonly IPlatformApplicationSettingContext applicationSettingContext;

        protected PlatformSendOutboxEventBusMessageHostedService(
            IHostApplicationLifetime applicationLifetime,
            ILoggerFactory loggerFactory,
            IServiceProvider serviceProvider,
            IPlatformApplicationSettingContext applicationSettingContext) : base(applicationLifetime, loggerFactory)
        {
            this.ServiceProvider = serviceProvider;
            this.applicationSettingContext = applicationSettingContext;
            this.eventBusProducer = serviceProvider.GetService<IPlatformEventBusProducer>();
            FullNameToDefinedEventBusTypeDic = serviceProvider
                .GetService<IPlatformEventBusManager>()?
                .GetScanAssemblies()
                .SelectMany(p => p.GetTypes())
                .GroupBy(p => p.FullName)
                .ToDictionary(p => p.Key, p => p.First()) ?? new Dictionary<string, Type>();
        }

        public static bool MatchImplementation(ServiceDescriptor serviceDescriptor)
        {
            return MatchImplementation(serviceDescriptor.ImplementationType) ||
                   MatchImplementation(serviceDescriptor.ImplementationInstance?.GetType());
        }

        public static bool MatchImplementation(Type implementationType)
        {
            return implementationType?.IsAssignableTo(
                typeof(PlatformSendOutboxEventBusMessageHostedService)) == true;
        }

        public static Expression<Func<PlatformOutboxEventBusMessage, bool>> ToHandleOutboxEventBusMessagesExpr(
            double retryProcessFailedMessageDelayTimeInSeconds,
            double messageProcessingExpiredInDays)
        {
            return p => p.SendStatus == PlatformOutboxEventBusMessage.SendStatuses.New ||
                        (p.SendStatus == PlatformOutboxEventBusMessage.SendStatuses.Failed && p.LastSendDate <= Clock.UtcNow.AddSeconds(-retryProcessFailedMessageDelayTimeInSeconds)) ||
                        (p.SendStatus == PlatformOutboxEventBusMessage.SendStatuses.Processing && p.LastSendDate <= Clock.UtcNow.AddDays(-messageProcessingExpiredInDays));
        }

        protected IServiceProvider ServiceProvider { get; }

        protected Dictionary<string, Type> FullNameToDefinedEventBusTypeDic { get; }

        protected override async Task IntervalProcess(CancellationToken cancellationToken)
        {
            if (!ApplicationStartedAndRunning || !HasOutboxEventBusMessageRepositoryRegistered() || isProcessing)
                return;

            isProcessing = true;

            try
            {
                // Retry in case of the db is not started, initiated or restarting
                await Policy.Handle<Exception>()
                    .WaitAndRetryAsync(
                        retryCount: ProcessSendMessageRetryCount(),
                        sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                        onRetry: (ex, timeSpan, currentRetry, ctx) =>
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
                            await SendMessageToBusAsync(scope, toHandleMessage, cancellationToken);
                        }
                        catch (Exception e)
                        {
                            Logger.LogError(e, $"[PlatformSendOutboxEventBusMessageHostedService] Try to produce outbox message with Id:{toHandleMessage.Id} failed. Message Content:{PlatformJsonSerializer.Serialize(toHandleMessage)}");
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
                    var outboxEventBusMessageRepo =
                        scope.ServiceProvider.GetService<IPlatformOutboxEventBusMessageRepository>();

                    var result = await outboxEventBusMessageRepo!.AnyAsync(ToHandleOutboxEventBusMessagesExpr(RetryProcessFailedMessageDelayTimeInSeconds(), MessageProcessingExpiredInDays()));

                    return result;
                }
            }
        }

        protected virtual async Task SendMessageToBusAsync(
            IServiceScope scope,
            PlatformOutboxEventBusMessage toHandleOutboxMessage,
            CancellationToken cancellationToken)
        {
            var messageType = FullNameToDefinedEventBusTypeDic.GetValueOrDefault(toHandleOutboxMessage.MessageTypeFullName, null);

            if (messageType != null && messageType.IsAssignableTo(typeof(IPlatformEventBusTrackableMessage)))
            {
                var message = (IPlatformEventBusTrackableMessage)JsonSerializer.Deserialize(
                    toHandleOutboxMessage.JsonMessage,
                    messageType,
                    PlatformJsonSerializer.CurrentOptions.Value);

                var uowManager = scope.ServiceProvider.GetService<IUnitOfWorkManager>();
                using (var uow = uowManager!.Begin())
                {
                    await PlatformOutboxEventBusProducerHelper.HandleSendingOutboxMessageAsync(
                        ServiceProvider,
                        uowManager,
                        scope.ServiceProvider.GetService<IPlatformOutboxEventBusMessageRepository>(),
                        eventBusProducer,
                        message,
                        toHandleOutboxMessage.RoutingKey,
                        isProcessingExistingOutboxMessage: true,
                        Logger,
                        cancellationToken);

                    await uow.CompleteAsync(cancellationToken);
                }
            }
        }

        protected async Task<List<PlatformOutboxEventBusMessage>> PopToHandleOutboxEventBusMessages(CancellationToken cancellationToken)
        {
            try
            {
                using (var scope = ServiceProvider.CreateScope())
                {
                    var uowManager = scope.ServiceProvider.GetService<IUnitOfWorkManager>();

                    using (var uow = uowManager!.Begin())
                    {
                        var outboxEventBusMessageRepo =
                            scope.ServiceProvider.GetService<IPlatformOutboxEventBusMessageRepository>();

                        var toHandleMessages = outboxEventBusMessageRepo!.GetAllQuery()
                            .Where(ToHandleOutboxEventBusMessagesExpr(RetryProcessFailedMessageDelayTimeInSeconds(), MessageProcessingExpiredInDays()))
                            .OrderBy(p => p.LastSendDate)
                            .Take(NumberOfProcessMessagesBatch())
                            .ToList();

                        toHandleMessages.ForEach(p =>
                        {
                            p.SendStatus = PlatformOutboxEventBusMessage.SendStatuses.Processing;
                            p.LastSendDate = DateTime.UtcNow;
                        });

                        await outboxEventBusMessageRepo.UpdateManyAsync(
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
                Logger.LogWarning(conflictDomainException, "Some other producer instance has been handling some outbox messages, which lead to row version conflict. This is as expected so just warning.");

                // Retry PopToHandleOutboxEventBusMessages
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
        /// To config how long a message can live in the database as Processing status in days. Default is 1 day;
        /// This to handle that if message for some reason has been set as Processing but failed to process and has not been set back to failed.
        /// </summary>
        protected virtual double MessageProcessingExpiredInDays()
        {
            return 1;
        }

        /// <summary>
        /// Config the time in seconds to retry process failed message from lastSendDate. Default is 60
        /// </summary>
        protected virtual double RetryProcessFailedMessageDelayTimeInSeconds()
        {
            return 60;
        }

        protected bool HasOutboxEventBusMessageRepositoryRegistered()
        {
            using (var scope = ServiceProvider.CreateScope())
            {
                return scope.ServiceProvider.GetService<IPlatformOutboxEventBusMessageRepository>() != null;
            }
        }
    }

    public class PlatformDefaultSendOutboxEventBusMessageHostedService : PlatformSendOutboxEventBusMessageHostedService
    {
        public PlatformDefaultSendOutboxEventBusMessageHostedService(
            IHostApplicationLifetime applicationLifetime,
            ILoggerFactory loggerFactory,
            IServiceProvider serviceProvider,
            IPlatformApplicationSettingContext applicationSettingContext) : base(applicationLifetime, loggerFactory, serviceProvider, applicationSettingContext)
        {
        }
    }
}
