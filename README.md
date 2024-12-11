## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## other

```bash
# build and push
$ docker build -t proferio/homework-project:v0.0.5 .
$ docker push proferio/homework-project:v0.0.5
$ docker run -p 3000:8000 proferio/homework-4:v0.0.6
```
