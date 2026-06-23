import { Body, Controller, Get, Param, Post, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { CrmQuotationService } from "./crm-quotation.service";
import { CustomerViewCommentDto } from "./dto/crm-quotation.dto";

@ApiTags("crm-customer-view")
@Controller("crm/customer-view")
export class CrmCustomerViewController {
  constructor(private readonly quotations: CrmQuotationService) {}

  @Get(":token")
  view(@Param("token") token: string) {
    return this.quotations.customerView(token);
  }

  @Get(":token/pdf")
  async pdf(@Param("token") token: string, @Res() res: Response) {
    const buffer = await this.quotations.customerViewPdf(token);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=quotation.pdf");
    res.send(buffer);
  }

  @Post(":token/accept")
  accept(@Param("token") token: string, @Body() dto: CustomerViewCommentDto) {
    return this.quotations.customerAccept(token, dto);
  }

  @Post(":token/reject")
  reject(@Param("token") token: string, @Body() dto: CustomerViewCommentDto) {
    return this.quotations.customerReject(token, dto);
  }

  @Post(":token/comment")
  comment(@Param("token") token: string, @Body() dto: CustomerViewCommentDto) {
    return this.quotations.customerComment(token, dto);
  }
}
