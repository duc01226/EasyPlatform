SET AngularDotnetPlatform_TEXTSNIPPET_UseMongoDb=false
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p BravoSuite-Example kill
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p BravoSuite-Example build
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p BravoSuite-Example up --remove-orphans
