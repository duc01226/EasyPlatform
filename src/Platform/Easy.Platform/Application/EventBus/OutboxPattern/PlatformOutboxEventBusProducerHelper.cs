using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.OutboxPattern
{
    public static class PlatformOutboxEventBusProducerHelper
    {
        public static async Task HandleSendingOutboxMessageAsync<TMessage>(
            IServiceProvider rootScopeServiceProvider,
            IServiceProvider currentScopeServiceProvider,
            TMessage message,
            string routingKey,
            bool isProcessingExistingOutboxMessage,
            PlatformOutboxConfig outboxConfig,
            ILogger logger,
            CancellationToken cancellationToken) where TMessage : IPlatformEventBusTrackableMessage
        {
            if (message.TrackingId != null)
            {
                var outboxEventBusMessageRepo = currentScopeServiceProvider.GetService<IPlatformOutboxEventBusMessageRepository>();
                var unitOfWorkManager = currentScopeServiceProvider.GetService<IUnitOfWorkManager>();

                var needToStartNewUow = outboxConfig.ForceAlwaysSendOutboxInNewUow || !unitOfWorkManager!.HasCurrentActive();

                var currentUow = needToStartNewUow
                    ? unitOfWorkManager!.Begin(suppressCurrentUow: true)
                    : unitOfWorkManager.Current();

                if (isProcessingExistingOutboxMessage)
                {
                    var existingOutboxMessage = await outboxEventBusMessageRepo!.GetByIdAsync(
                        PlatformOutboxEventBusMessage.BuildId(message), cancellationToken);

                    if (existingOutboxMessage.SendStatus is
                        PlatformOutboxEventBusMessage.SendStatuses.New or
                        PlatformOutboxEventBusMessage.SendStatuses.Failed or
                        PlatformOutboxEventBusMessage.SendStatuses.Processing)
                    {
                        await SendExistingOutboxMessageAsync(
                            rootScopeServiceProvider, currentScopeServiceProvider, message, routingKey, logger, cancellationToken);
                    }
                }
                else
                {
                    await SaveAndTrySendNewOutboxMessageAsync(
                        rootScopeServiceProvider,
                        currentUow: currentUow,
                        outboxEventBusMessageRepo,
                        message,
                        routingKey,
                        autoCompleteUow: needToStartNewUow,
                        cancellationToken);
                }
            }
            else
            {
                var eventBusProducer = currentScopeServiceProvider.GetService<IPlatformEventBusProducer>();

                await eventBusProducer!.SendTrackableMessageAsync(message, routingKey, cancellationToken);
            }
        }

        public static async Task SaveAndTrySendNewOutboxMessageAsync<TMessage>(
            IServiceProvider rootScopeServiceProvider,
            IUnitOfWork currentUow,
            IPlatformOutboxEventBusMessageRepository outboxEventBusMessageRepo,
            TMessage message,
            string routingKey,
            bool autoCompleteUow,
            CancellationToken cancellationToken)
            where TMessage : IPlatformEventBusTrackableMessage
        {
            var newProcessingOutboxMessage = PlatformOutboxEventBusMessage.Create(
                message,
                routingKey,
                PlatformOutboxEventBusMessage.SendStatuses.Processing);

            await outboxEventBusMessageRepo.CreateAsync(
                newProcessingOutboxMessage,
                dismissSendEvent: true,
                cancellationToken);

            // Do not need to wait for uow completed if the uow for db do not handle actually transaction.
            // Can execute it immediately without waiting for uow to complete
            if (currentUow.IsNoTransactionUow())
            {
                var logger = rootScopeServiceProvider.GetService<ILoggerFactory>()!.CreateLogger(
                    categoryName: nameof(PlatformOutboxEventBusProducerHelper));

                await SendExistingOutboxMessageAsync(
                    rootScopeServiceProvider,
                    rootScopeServiceProvider,
                    message,
                    routingKey,
                    logger,
                    cancellationToken);
            }
            else
            {
                currentUow.OnCompleted += (sender, args) =>
                {
                    // Try to process newProcessingOutboxMessage first time after saved
                    SendExistingOutboxMessageInNewScopeAsync(
                        rootScopeServiceProvider,
                        message,
                        routingKey,
                        cancellationToken).Wait(cancellationToken);
                };
            }

            if (autoCompleteUow)
                await currentUow.CompleteAsync(cancellationToken);
        }

        public static async Task SendExistingOutboxMessageInNewScopeAsync<TMessage>(
            IServiceProvider rootScopeServiceProvider,
            TMessage message,
            string routingKey,
            CancellationToken cancellationToken) where TMessage : IPlatformEventBusTrackableMessage
        {
            using (var newScope = rootScopeServiceProvider.CreateScope())
            {
                var unitOfWorkManager = newScope.ServiceProvider.GetService<IUnitOfWorkManager>();
                var logger = newScope.ServiceProvider.GetService<ILoggerFactory>()!.CreateLogger(
                    categoryName: nameof(PlatformOutboxEventBusProducerHelper));

                using (var uow = unitOfWorkManager!.Begin())
                {
                    await SendExistingOutboxMessageAsync(
                        rootScopeServiceProvider,
                        newScope.ServiceProvider,
                        message,
                        routingKey,
                        logger,
                        cancellationToken);

                    await uow.CompleteAsync(cancellationToken);
                }
            }
        }

        public static async Task SendExistingOutboxMessageAsync<TMessage>(
            IServiceProvider rootScopeServiceProvider,
            IServiceProvider currentScopeServiceProvider,
            TMessage message,
            string routingKey,
            ILogger logger,
            CancellationToken cancellationToken)
            where TMessage : IPlatformEventBusTrackableMessage
        {
            var outboxEventBusMessageRepo = currentScopeServiceProvider.GetService<IPlatformOutboxEventBusMessageRepository>();
            var eventBusProducer = currentScopeServiceProvider.GetService<IPlatformEventBusProducer>();

            try
            {
                await eventBusProducer!.SendTrackableMessageAsync(message, routingKey, cancellationToken);

                await UpdateExistingOutboxMessageProcessed(outboxEventBusMessageRepo, PlatformOutboxEventBusMessage.BuildId(message), cancellationToken);
            }
            catch (Exception exception)
            {
                await UpdateExistingOutboxMessageFailedInNewScope(
                    rootScopeServiceProvider,
                    PlatformOutboxEventBusMessage.BuildId(message),
                    exception,
                    logger,
                    cancellationToken);
            }
        }

        public static async Task UpdateExistingOutboxMessageProcessed(
            IPlatformOutboxEventBusMessageRepository outboxEventBusMessageRepo,
            string messageId,
            CancellationToken cancellationToken)
        {
            var existingOutboxMessage = await outboxEventBusMessageRepo.GetByIdAsync(
                messageId,
                cancellationToken);

            existingOutboxMessage.LastSendDate = DateTime.UtcNow;
            existingOutboxMessage.SendStatus = PlatformOutboxEventBusMessage.SendStatuses.Processed;

            await outboxEventBusMessageRepo.UpdateAsync(existingOutboxMessage, cancellationToken: cancellationToken);
        }

        public static async Task UpdateExistingOutboxMessageFailedInNewScope(
            IServiceProvider rootScopeServiceProvider,
            string messageId,
            Exception exception,
            ILogger logger,
            CancellationToken cancellationToken)
        {
            using (var newScope = rootScopeServiceProvider.CreateScope())
            {
                var outboxEventBusMessageRepo = newScope.ServiceProvider.GetService<IPlatformOutboxEventBusMessageRepository>();
                var unitOfWorkManager = newScope.ServiceProvider.GetService<IUnitOfWorkManager>();

                using (var newUowForTrySendMessageToBus = unitOfWorkManager!.Begin())
                {
                    var existingOutboxMessage = await outboxEventBusMessageRepo!.GetByIdAsync(
                        messageId,
                        cancellationToken);

                    existingOutboxMessage.SendStatus = PlatformOutboxEventBusMessage.SendStatuses.Failed;
                    existingOutboxMessage.LastSendDate = DateTime.UtcNow;
                    existingOutboxMessage.LastSendError = PlatformJsonSerializer.Serialize(new { exception.Message, exception.StackTrace });

                    await outboxEventBusMessageRepo.UpdateAsync(existingOutboxMessage, cancellationToken: cancellationToken);

                    await newUowForTrySendMessageToBus.CompleteAsync(cancellationToken);

                    logger.LogError(
                        exception,
                        $"Error Send message [RoutingKey:{existingOutboxMessage.RoutingKey}], [Type:{existingOutboxMessage.MessageTypeFullName}].{Environment.NewLine}" +
                        $"Message Info: ${existingOutboxMessage.JsonMessage}.{Environment.NewLine}");
                }
            }
        }
    }
}
