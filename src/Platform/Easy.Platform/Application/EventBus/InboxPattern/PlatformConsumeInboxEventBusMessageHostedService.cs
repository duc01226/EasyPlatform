using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.Context;
using Easy.Platform.Application.EventBus.Consumers;
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
            ConsumerByValueToDefinedEventBusConsumerTypeDic = serviceProvider
                .GetService<IPlatformEventBusManager>()?
                .AllDefinedEventBusConsumerTypes()
                .ToDictionary(PlatformInboxEventBusConsumerHelper.GetConsumerByValue, p => p) ?? new Dictionary<string, Type>();
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
            double messageProcessingExpiredInDays)
        {
            return p => p.ConsumeStatus == PlatformInboxEventBusMessage.ConsumeStatuses.New ||
                        (p.ConsumeStatus == PlatformInboxEventBusMessage.ConsumeStatuses.Failed && p.LastConsumeDate <= Clock.UtcNow.AddSeconds(-retryProcessFailedMessageDelayTimeInSeconds)) ||
                        (p.ConsumeStatus == PlatformInboxEventBusMessage.ConsumeStatuses.Processing && p.LastConsumeDate <= Clock.UtcNow.AddDays(-messageProcessingExpiredInDays));
        }

        protected IServiceProvider ServiceProvider { get; }

        protected Dictionary<string, Type> ConsumerByValueToDefinedEventBusConsumerTypeDic { get; }

        protected override async Task IntervalProcess(CancellationToken cancellationToken)
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

                    var result = await inboxEventBusMessageRepo!.AnyAsync(ToHandleInboxEventBusMessagesExpr(RetryProcessFailedMessageDelayTimeInSeconds(), MessageProcessingExpiredInDays()));

                    return result;
                }
            }
        }

        protected virtual async Task InvokeConsumerAsync(
            IServiceScope scope,
            PlatformInboxEventBusMessage toHandleInboxMessage,
            CancellationToken cancellationToken)
        {
            var consumerType = ConsumerByValueToDefinedEventBusConsumerTypeDic.GetValueOrDefault(toHandleInboxMessage.ConsumerBy, null);

            var consumer = consumerType != null
                ? scope.ServiceProvider.GetService(consumerType)
                : null;

            if (consumer is IPlatformInboxSupportEventBusConsumer inboxSupportEventBusConsumer)
            {
                inboxSupportEventBusConsumer.IsProcessingExistingInboxMessage = true;

                // Get a generic type: PlatformEventBusMessage<TMessage> where TMessage = TMessagePayload
                // of IPlatformEventBusConsumer<TMessagePayload>
                var consumerMessageType = PlatformEventBusBaseConsumer.GetConsumerMessageType(inboxSupportEventBusConsumer);

                var eventBusMessage = Util.Tasks.CatchExceptionContinueThrow(
                    () => JsonSerializer.Deserialize(
                        toHandleInboxMessage.JsonMessage,
                        consumerMessageType,
                        inboxSupportEventBusConsumer.CustomJsonSerializerOptions() ?? PlatformJsonSerializer.CurrentOptions.Value),
                    ex => Logger.LogError(
                        ex,
                        $"RabbitMQ parsing message to {consumerMessageType.Name} error for the routing key {toHandleInboxMessage.RoutingKey}.{Environment.NewLine} Body: {toHandleInboxMessage.JsonMessage}"));

                if (eventBusMessage != null)
                {
                    await PlatformEventBusBaseConsumer.InvokeConsumer(
                        inboxSupportEventBusConsumer,
                        eventBusMessage,
                        toHandleInboxMessage.RoutingKey,
                        IsLogConsumerProcessTime(),
                        LogErrorSlowProcessWarningTimeMilliseconds(),
                        Logger,
                        cancellationToken);
                }
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
                            .Where(ToHandleInboxEventBusMessagesExpr(RetryProcessFailedMessageDelayTimeInSeconds(), MessageProcessingExpiredInDays()))
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
        /// To config how long a message can live in the database as Processing status in days. Default is 1 day;
        /// This to handle that if message for some reason has been set as Processing but failed to process and has not been set back to failed.
        /// </summary>
        protected virtual double MessageProcessingExpiredInDays()
        {
            return 1;
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
