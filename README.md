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
$ docker build -t proferio/homework-6:v0.0.1 .
$ docker push proferio/homework-6:v0.0.1
$ docker run -p 3000:8000 proferio/homework-4:v0.0.6
```
