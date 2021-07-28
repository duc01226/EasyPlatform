docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p AngularDotnetPlatform-Example build sql-data
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p AngularDotnetPlatform-Example up sql-data
