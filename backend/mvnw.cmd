@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF)
@REM Maven Wrapper startup batch script for Windows
@REM ----------------------------------------------------------------------------

@echo off
setlocal

set MAVEN_PROJECTBASEDIR=%~dp0
set MAVEN_WRAPPER_PROPERTIES=%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.properties

@REM Check if wrapper jar exists
set MAVEN_WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.jar

if exist "%MAVEN_WRAPPER_JAR%" (
    goto runMaven
)

@REM Download wrapper jar if not present
echo Downloading Maven Wrapper...
for /f "tokens=2 delims==" %%a in ('findstr "wrapperUrl" "%MAVEN_WRAPPER_PROPERTIES%"') do set WRAPPER_URL=%%a

if not "%WRAPPER_URL%"=="" (
    powershell -Command "Invoke-WebRequest -Uri '%WRAPPER_URL%' -OutFile '%MAVEN_WRAPPER_JAR%'"
)

:runMaven
@REM Read distribution URL
for /f "tokens=2 delims==" %%a in ('findstr "distributionUrl" "%MAVEN_WRAPPER_PROPERTIES%"') do set MAVEN_DIST_URL=%%a

@REM Set up Maven home
set MAVEN_HOME=%USERPROFILE%\.m2\wrapper\dists
set MAVEN_ZIP=%MAVEN_HOME%\maven.zip

if not exist "%MAVEN_HOME%" mkdir "%MAVEN_HOME%"

@REM Check if Maven is already downloaded
set MAVEN_BIN=
for /d %%d in ("%MAVEN_HOME%\apache-maven-*") do set MAVEN_BIN=%%d\bin

if "%MAVEN_BIN%"=="" (
    echo Downloading Maven distribution...
    powershell -Command "Invoke-WebRequest -Uri '%MAVEN_DIST_URL%' -OutFile '%MAVEN_ZIP%'"
    echo Extracting Maven...
    powershell -Command "Expand-Archive -Path '%MAVEN_ZIP%' -DestinationPath '%MAVEN_HOME%' -Force"
    del "%MAVEN_ZIP%"
    for /d %%d in ("%MAVEN_HOME%\apache-maven-*") do set MAVEN_BIN=%%d\bin
)

@REM Run Maven
"%MAVEN_BIN%\mvn.cmd" %*
