docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p EasyPlatform-Example kill sql-data mongo-data rabbitmq redis-cache
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p EasyPlatform-Example build sql-data mongo-data rabbitmq redis-cache
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p EasyPlatform-Example up --remove-orphans sql-data mongo-data rabbitmq redis-cache
pause
