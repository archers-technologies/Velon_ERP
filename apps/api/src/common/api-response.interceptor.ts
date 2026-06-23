import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data === undefined || data === null) {
          return { success: true };
        }
        if (
          typeof data === "object" &&
          data !== null &&
          "success" in data &&
          typeof (data as { success: unknown }).success === "boolean"
        ) {
          return data;
        }
        return { success: true, data };
      }),
    );
  }
}
