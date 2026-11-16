import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Public } from '../auth/public.decorator';

// The page is static and holds no data; every API call it makes needs the admin key.
const STATIC_DIR = join(__dirname, 'static');
const files = {
  html: readFileSync(join(STATIC_DIR, 'index.html'), 'utf8'),
  js: readFileSync(join(STATIC_DIR, 'app.js'), 'utf8'),
  css: readFileSync(join(STATIC_DIR, 'styles.css'), 'utf8'),
};

const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "connect-src 'self'",
  "img-src 'self' data:",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

@Public()
@ApiExcludeController()
@Controller('admin')
export class AdminController {
  @Get()
  page(@Res() res: Response) {
    res
      .set({
        'content-type': 'text/html; charset=utf-8',
        'content-security-policy': CSP,
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
        'cache-control': 'no-store',
      })
      .send(files.html);
  }

  @Get('app.js')
  @Header('content-type', 'text/javascript; charset=utf-8')
  @Header('x-content-type-options', 'nosniff')
  script() {
    return files.js;
  }

  @Get('styles.css')
  @Header('content-type', 'text/css; charset=utf-8')
  @Header('x-content-type-options', 'nosniff')
  styles() {
    return files.css;
  }
}
