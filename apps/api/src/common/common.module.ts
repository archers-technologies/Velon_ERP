import { Global, Module } from "@nestjs/common";
import { VelonLogger } from "./logger.service";

@Global()
@Module({
  providers: [VelonLogger],
  exports: [VelonLogger],
})
export class CommonModule {}
