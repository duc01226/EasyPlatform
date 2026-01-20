#See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.


FROM mcr.microsoft.com/dotnet/sdk:9.0 AS base

FROM base AS final
WORKDIR /app

# Copy NuGet config and editorconfig
COPY NuGetDocker.Config ./nuget.config
COPY ./.editorconfig ./.editorconfig

COPY Platform/Easy.Platform/Easy.Platform.csproj Platform/Easy.Platform/
COPY Platform/Easy.Platform.AspNetCore/Easy.Platform.AspNetCore.csproj Platform/Easy.Platform.AspNetCore/
COPY Platform/Easy.Platform.EfCore/Easy.Platform.EfCore.csproj Platform/Easy.Platform.EfCore/
COPY Platform/Easy.Platform.FireBasePushNotification/Easy.Platform.FirebasePushNotification.csproj Platform/Easy.Platform.FireBasePushNotification/
COPY Platform/Easy.Platform.HangfireBackgroundJob/Easy.Platform.HangfireBackgroundJob.csproj Platform/Easy.Platform.HangfireBackgroundJob/
COPY Platform/Easy.Platform.MongoDB/Easy.Platform.MongoDB.csproj Platform/Easy.Platform.MongoDB/
COPY Platform/Easy.Platform.RabbitMQ/Easy.Platform.RabbitMQ.csproj Platform/Easy.Platform.RabbitMQ/
COPY Platform/Easy.Platform.RedisCache/Easy.Platform.RedisCache.csproj Platform/Easy.Platform.RedisCache/
COPY Platform/Easy.Platform.AzureFileStorage/Easy.Platform.AzureFileStorage.csproj Platform/Easy.Platform.AzureFileStorage/
COPY Platform/Easy.Platform.AutomationTest/Easy.Platform.AutomationTest.csproj Platform/Easy.Platform.AutomationTest/

RUN dotnet restore ./Platform/Easy.Platform/Easy.Platform.csproj
RUN dotnet restore ./Platform/Easy.Platform.AspNetCore/Easy.Platform.AspNetCore.csproj
RUN dotnet restore ./Platform/Easy.Platform.EfCore/Easy.Platform.EfCore.csproj
RUN dotnet restore ./Platform/Easy.Platform.FireBasePushNotification/Easy.Platform.FirebasePushNotification.csproj
RUN dotnet restore ./Platform/Easy.Platform.HangfireBackgroundJob/Easy.Platform.HangfireBackgroundJob.csproj
RUN dotnet restore ./Platform/Easy.Platform.MongoDB/Easy.Platform.MongoDB.csproj
RUN dotnet restore ./Platform/Easy.Platform.RabbitMQ/Easy.Platform.RabbitMQ.csproj
RUN dotnet restore ./Platform/Easy.Platform.RedisCache/Easy.Platform.RedisCache.csproj
RUN dotnet restore ./Platform/Easy.Platform.AzureFileStorage/Easy.Platform.AzureFileStorage.csproj
RUN dotnet restore ./Platform/Easy.Platform.AutomationTest/Easy.Platform.AutomationTest.csproj

COPY Backend/PlatformExampleApp.Test.Shared/PlatformExampleApp.Test.Shared.csproj Backend/PlatformExampleApp.Test.Shared/
COPY Backend/PlatformExampleApp.Test.BDD/PlatformExampleApp.Test.BDD.csproj Backend/PlaBackend/t.BDD/
RUN dotnet restore ./Backend/PlatformExampleApp.Test.BDD/PlatformExampleApp.Test.BDD.csproj

COPY Platform Platform
COPY Backend/PlatformExampleApp.Test.Shared Backend/PlaBackend/t.Shared
COPY Backend/PlatformExampleApp.Test.BDD Backend/PlaBackend/t.BDD
ENTRYPOINT ["/bin/sh", "-c" , "dotnet test /app/Backend/PlatformExampleApp.Test.BDD/PlatformExampleApp.Test.BDD.csproj --no-restore"]
