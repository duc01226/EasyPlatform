# Stage 1: Build Platform and Shared projects
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS restore-stage
WORKDIR /src

# Copy NuGet config and editorconfig
COPY NuGetDocker.Config ./nuget.config
COPY ./.editorconfig ./.editorconfig

# Copy and restore Platform projects
COPY ["Platform/Easy.Platform/Easy.Platform.csproj", "Platform/Easy.Platform/"]
COPY ["Platform/Easy.Platform.AspNetCore/Easy.Platform.AspNetCore.csproj", "Platform/Easy.Platform.AspNetCore/"]
COPY ["Platform/Easy.Platform.EfCore/Easy.Platform.EfCore.csproj", "Platform/Easy.Platform.EfCore/"]
COPY ["Platform/Easy.Platform.FireBasePushNotification/Easy.Platform.FirebasePushNotification.csproj", "Platform/Easy.Platform.FireBasePushNotification/"]
COPY ["Platform/Easy.Platform.HangfireBackgroundJob/Easy.Platform.HangfireBackgroundJob.csproj", "Platform/Easy.Platform.HangfireBackgroundJob/"]
COPY ["Platform/Easy.Platform.MongoDB/Easy.Platform.MongoDB.csproj", "Platform/Easy.Platform.MongoDB/"]
COPY ["Platform/Easy.Platform.RabbitMQ/Easy.Platform.RabbitMQ.csproj", "Platform/Easy.Platform.RabbitMQ/"]
COPY ["Platform/Easy.Platform.RedisCache/Easy.Platform.RedisCache.csproj", "Platform/Easy.Platform.RedisCache/"]
COPY ["Platform/Easy.Platform.AzureFileStorage/Easy.Platform.AzureFileStorage.csproj", "Platform/Easy.Platform.AzureFileStorage/"]
COPY ["Platform/Easy.Platform.CustomAnalyzers/Easy.Platform.CustomAnalyzers.csproj", "Platform/Easy.Platform.CustomAnalyzers/"]

RUN dotnet restore "Platform/Easy.Platform/Easy.Platform.csproj"
RUN dotnet restore "Platform/Easy.Platform.AspNetCore/Easy.Platform.AspNetCore.csproj"
RUN dotnet restore "Platform/Easy.Platform.EfCore/Easy.Platform.EfCore.csproj"
RUN dotnet restore "Platform/Easy.Platform.FireBasePushNotification/Easy.Platform.FirebasePushNotification.csproj"
RUN dotnet restore "Platform/Easy.Platform.HangfireBackgroundJob/Easy.Platform.HangfireBackgroundJob.csproj"
RUN dotnet restore "Platform/Easy.Platform.MongoDB/Easy.Platform.MongoDB.csproj"
RUN dotnet restore "Platform/Easy.Platform.RabbitMQ/Easy.Platform.RabbitMQ.csproj"
RUN dotnet restore "Platform/Easy.Platform.RedisCache/Easy.Platform.RedisCache.csproj"
RUN dotnet restore "Platform/Easy.Platform.AzureFileStorage/Easy.Platform.AzureFileStorage.csproj"
RUN dotnet restore "Platform/Easy.Platform.CustomAnalyzers/Easy.Platform.CustomAnalyzers.csproj"

# Stage 2: Build the main service
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS platform-build
WORKDIR /src
# Copy the NuGet cache from the restore-stage stage
COPY --from=restore-stage /root/.nuget/packages /root/.nuget/packages
# Copy the pre-built Platform artifacts from the restore-stage stage
COPY --from=restore-stage /src .

# Copy the rest of the Platform and Shared code and build
COPY Platform Platform/
RUN dotnet build "Platform/Easy.Platform/Easy.Platform.csproj" -c Release --no-restore
RUN dotnet build "Platform/Easy.Platform.AspNetCore/Easy.Platform.AspNetCore.csproj" -c Release --no-restore
RUN dotnet build "Platform/Easy.Platform.EfCore/Easy.Platform.EfCore.csproj" -c Release --no-restore
RUN dotnet build "Platform/Easy.Platform.FireBasePushNotification/Easy.Platform.FirebasePushNotification.csproj" -c Release --no-restore
RUN dotnet build "Platform/Easy.Platform.HangfireBackgroundJob/Easy.Platform.HangfireBackgroundJob.csproj" -c Release --no-restore
RUN dotnet build "Platform/Easy.Platform.MongoDB/Easy.Platform.MongoDB.csproj" -c Release --no-restore
RUN dotnet build "Platform/Easy.Platform.RabbitMQ/Easy.Platform.RabbitMQ.csproj" -c Release --no-restore
RUN dotnet build "Platform/Easy.Platform.RedisCache/Easy.Platform.RedisCache.csproj" -c Release --no-restore
RUN dotnet build "Platform/Easy.Platform.AzureFileStorage/Easy.Platform.AzureFileStorage.csproj" -c Release --no-restore
RUN dotnet build "Platform/Easy.Platform.CustomAnalyzers/Easy.Platform.CustomAnalyzers.csproj" -c Release --no-restore

# Stage 3: Build the main service
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
# Copy the NuGet cache from the platform-build stage
COPY --from=platform-build /root/.nuget/packages /root/.nuget/packages
# Copy the pre-built Platform artifacts from the platform-build stage
COPY --from=platform-build /src .

# Copy the main service .csproj files and restore
COPY ["PlatformExampleApp/PlatformExampleApp.TextSnippet.Api/PlatformExampleApp.TextSnippet.Api.csproj", "PlatformExampleApp/PlatformExampleApp.TextSnippet.Api/"]
COPY ["PlatformExampleApp/PlatformExampleApp.TextSnippet.Application/PlatformExampleApp.TextSnippet.Application.csproj", "PlatformExampleApp/PlatformExampleApp.TextSnippet.Application/"]
COPY ["PlatformExampleApp/PlatformExampleApp.TextSnippet.Domain/PlatformExampleApp.TextSnippet.Domain.csproj", "PlatformExampleApp/PlatformExampleApp.TextSnippet.Domain/"]
COPY ["PlatformExampleApp/PlatformExampleApp.TextSnippet.Infrastructure/PlatformExampleApp.TextSnippet.Infrastructure.csproj", "PlatformExampleApp/PlatformExampleApp.TextSnippet.Infrastructure/"]
COPY ["PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence/PlatformExampleApp.TextSnippet.Persistence.csproj", "PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence/"]
COPY ["PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.Mongo/PlatformExampleApp.TextSnippet.Persistence.Mongo.csproj", "PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.Mongo/"]
COPY ["PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo.csproj", "PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo/"]
COPY ["PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.PostgreSql/PlatformExampleApp.TextSnippet.Persistence.PostgreSql.csproj", "PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.PostgreSql/"]
COPY ["PlatformExampleApp/PlatformExampleApp.Shared/PlatformExampleApp.Shared.csproj", "PlatformExampleApp/PlatformExampleApp.Shared/"]

RUN dotnet restore "PlatformExampleApp/PlatformExampleApp.TextSnippet.Api/PlatformExampleApp.TextSnippet.Api.csproj"

# Copy the rest of the service code
COPY PlatformExampleApp PlatformExampleApp/
# Publish the main service, using the pre-built artifacts
ARG Configuration=Release
RUN dotnet publish "PlatformExampleApp/PlatformExampleApp.TextSnippet.Api/PlatformExampleApp.TextSnippet.Api.csproj" -c ${Configuration} -o /app --no-restore

# Final stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
EXPOSE 80 443
# install curl to do health check
RUN apt-get update && apt-get install -y curl
WORKDIR /app
COPY --from=build /app .

# Environment variables
ENV DOTNET_GCHighMemPercent=50
ENV DOTNET_GCConserveMemory=7

# Config Pyroscope Dotnet Profiler
COPY --from=pyroscope/pyroscope-dotnet:0.8.14-glibc /Pyroscope.Profiler.Native.so ./Pyroscope.Profiler.Native.so
COPY --from=pyroscope/pyroscope-dotnet:0.8.14-glibc /Pyroscope.Linux.ApiWrapper.x64.so ./Pyroscope.Linux.ApiWrapper.x64.so

ENTRYPOINT ["/bin/sh", "-c", "update-ca-certificates && dotnet PlatformExampleApp.TextSnippet.Api.dll"]
