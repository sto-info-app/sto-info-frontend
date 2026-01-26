# sto-info-frontend  [![Uptime status](https://img.shields.io/uptimerobot/status/m802169070-054df85f9c4a66231e51da43.svg)](https://status.startrekonline.info/) [![Uptime 30 days](https://img.shields.io/uptimerobot/ratio/m802169070-054df85f9c4a66231e51da43.svg)](https://status.startrekonline.info/)

## Project Overview

The `sto-info-frontend` is a frontend static site to provide information related to STO (Star Trek Online) player's accounts, characters and fleets. It is built using modern web technologies and follows best practices.

This project uses [Angular CLI](https://github.com/angular/angular-cli) (see `package.json` devDependency `@angular/cli`, currently `^21.0.5`).

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

### Coverage (local / CI)

To generate a coverage report, run:

```bash
npm run test:cov
```

Coverage output is written to `coverage/` (including an `lcov.info` file used by tooling such as SonarQube).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

## Contributing

We welcome contributions! Please read our [contributing guidelines](CONTRIBUTING.md) for more details.

## Code Quality

We use SonarQube Cloud to ensure the code quality of this project. SonarQube helps us to identify bugs, vulnerabilities, and code smells in our codebase.

[![SonarQube Cloud](https://sonarcloud.io/images/project_badges/sonarcloud-light.svg)](https://sonarcloud.io/summary/new_code?id=steverobertsuk_sto-info-frontend)

### Running SonarQube Analysis

The SonarQube analysis gets run automatically. To access the SonarQube portal for this project, please contact us at [support@startrekonline.info](mailto:support@startrekonline.info) to request being added as a user.

You can learn more about SonarQube from their [official website](https://www.sonarsource.com/products/sonarcloud/).

### Configure SonarQube Analysis in Visual Studio Code

Install the [SonarQube IDE](https://www.sonarsource.com/products/sonarlint/) and configure your `.vscode/settings.json` file to include this configuration:

```json
{
  "sonarCloudOrganization": "steverobertsuk",
  "projectKey": "steverobertsuk_sto-info-frontend"
}
```

The analysis results will be available on the SonarQube dashboard.

### Current SonarQube Analysis

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=steverobertsuk_sto-info-frontend&metric=alert_status&token=7eecc822c359d319aa1ae202c99601cbff43af90)](https://sonarcloud.io/summary/new_code?id=steverobertsuk_sto-info-frontend) [![Bugs](https://sonarcloud.io/api/project_badges/measure?project=steverobertsuk_sto-info-frontend&metric=bugs&token=7eecc822c359d319aa1ae202c99601cbff43af90)](https://sonarcloud.io/summary/new_code?id=steverobertsuk_sto-info-frontend) [![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=steverobertsuk_sto-info-frontend&metric=code_smells&token=7eecc822c359d319aa1ae202c99601cbff43af90)](https://sonarcloud.io/summary/new_code?id=steverobertsuk_sto-info-frontend) [![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=steverobertsuk_sto-info-frontend&metric=duplicated_lines_density&token=7eecc822c359d319aa1ae202c99601cbff43af90)](https://sonarcloud.io/summary/new_code?id=steverobertsuk_sto-info-frontend)

## Licence

This project is licensed under the MIT Licence. See the [LICENCE](LICENCE) file for more information.

## Intellectual Property Rights

This app respects the copyright and intellectual property rights of Star Trek Online and Star Trek. CBS Studios Inc. owns STAR TREK, and Cryptic Studios Inc owns STAR TREK ONLINE with all their related marks, logos and characters.

## Contact

For any enquiries, please contact us at [support@startrekonline.info](mailto:support@startrekonline.info).
