SET AngularDotnetPlatform_TEXTSNIPPET_UseMongoDb=false
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p AngularDotnetPlatform-Example kill
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p AngularDotnetPlatform-Example build
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p AngularDotnetPlatform-Example up --remove-orphans
pause
