This is a simple web application to serve coverage reports generated
by LCOV directly from compressed zip files.

# Deployment

In order to deploy this you can simply do:

    docker run -it -e GH_REPO=alisw/coverage-reports -v /some/data/volume:/data -p 8000 alisw/node

This should start the application on port 8000. Alternatively, if you do
not want to use docker, you can simply do:

    npm start

The application can be configured by setting the following variables:

- `COVERAGE_PORT`: the port to be used by the server (defaults to 8000).
- `COVERAGE_IP`: the ip to bind the server to (defaults to 0.0.0.0).
- `DATA_DIR`: the location of the zipped data files.

# APIs

The only APIs available at the moment are:

- `/health`  : returns 200 if the server is healthy.
- `/reports` : returns a list of the available reports.
