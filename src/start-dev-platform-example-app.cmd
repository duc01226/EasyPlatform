docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p AngularDotnetPlatform-Example down
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p AngularDotnetPlatform-Example build
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p AngularDotnetPlatform-Example up --remove-orphans
