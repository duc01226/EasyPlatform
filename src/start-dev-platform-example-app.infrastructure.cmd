docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p AngularDotnetPlatform-Example down sql-data mongo-data rabbitmq redis-cache
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p AngularDotnetPlatform-Example build sql-data mongo-data rabbitmq redis-cache
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p AngularDotnetPlatform-Example up --remove-orphans sql-data mongo-data rabbitmq redis-cache
