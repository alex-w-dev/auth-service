import { Module } from '@nestjs/common';
import { RabbitMqController } from './rabbit-mq.controller';
import { RabbitMqService } from './rabbit-mq.service';
import { RMQModule } from 'nestjs-rmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    process.env.NODE_ENV === 'test'
      ? RMQModule.forTest({})
      : RMQModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            console.log(configService.get('AMQP_HOST'));
            return {
              // serviceName: 'MAIL_SERVICE',
              // exchangeOptions: {},

              exchangeName: configService.get('AMQP_HOST'),
              assertExchangeType: configService.get('AMQP_EXCHANGE_TYPE'),
              autoBindingRoutes: true,
              queueName: configService.get('AMQP_QUEUE') || undefined,

              connections: [
                {
                  login: configService.get('AMQP_LOGIN'),
                  password: configService.get('AMQP_PASSWORD'),
                  host: configService.get('AMQP_HOST'),
                  port:
                    (configService.get('AMQP_PORT') &&
                      parseInt(configService.get('AMQP_PORT'))) ||
                    5672,
                  // vhost: '/',
                  // protocol: RMQ_PROTOCOL.AMQPS,
                },
              ],
            };
          },
        }),

    // : RabbitMQModule.forRootAsync(RabbitMQModule, {
    //       imports: [ConfigModule],
    //       inject: [ConfigService],
    //       useFactory: (configService: ConfigService) => {
    //         console.log(configService.get('AMQP_HOST'));
    //         const connectionData = {
    //           login: configService.get('AMQP_LOGIN'),
    //           password: configService.get('AMQP_PASSWORD'),
    //           host: configService.get('AMQP_HOST'),
    //           port:
    //             (configService.get('AMQP_PORT') &&
    //               parseInt(configService.get('AMQP_PORT'))) ||
    //             5672,
    //           vhost: '/',
    //           protocol: RMQ_PROTOCOL.AMQPS,
    //         };
    //         return {
    //           exchanges: [
    //             {
    //               name: 'amq.direct',
    //               type: 'direct',
    //             },
    //           ],
    //           uri: `amqp://${connectionData.login}:${connectionData.password}@${connectionData.host}:${connectionData.port}`,
    //           connectionInitOptions: { wait: false },
    //         };
    //       },
    //     }),
  ],
  providers: [RabbitMqService],
  controllers: [RabbitMqController],
})
export class RabbitMqModule {}
