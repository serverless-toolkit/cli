# Serverless Toolkit (STK) CLI

## Setup a new project

### Install the STK CLI

```
npm install -g @serverless-toolkit/cli
```

### Prepare a new project

```
➜  stk init
```

```
✔ Enter your project name: · api
✔ Do you wanna use Route53 domain? (y/N) · true
✔ Enter your Route53 domain name: · serverless-toolkit.com
✔ Do you wanna use GitHub actions for deployments? (y/N) · true

Project api initiated. Change to folder api and enter

stk bootstrap

to prepare the development in AWS.
```

### Bootstrap - prepare the serverless runtime in AWS

```
➜ cd api
➜ stk bootstrap
```

### Start local development

> File changes will be updated and deployed in the background.

```
➜ stk dev
```

### Manually deploy your file changes

```
➜ stk update
```

### Manually run tests

```
➜ stk test
```