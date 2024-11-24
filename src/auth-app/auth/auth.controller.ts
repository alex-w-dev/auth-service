import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth/local-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth/refresh-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
// import { GoogleAuthGuard } from './guards/google-auth/google-auth.guard';

@ApiBearerAuth()
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @ApiBody({
    type: LoginDto,
  })
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user.id);
  }

  @Public()
  @UseGuards(RefreshAuthGuard)
  @Post('refresh')
  refreshToken(@Req() req) {
    return this.authService.refreshToken(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('signout')
  signOut(@Req() req) {
    return this.authService.signOut(req.user.id);
  }

  // @Public()
  // @UseGuards(GoogleAuthGuard)
  // @Get('google/login')
  // googleLogin() {}

  // @Public()
  // @UseGuards(GoogleAuthGuard)
  // @Get('google/callback')
  // async googleCallback(@Req() req, @Res() res) {
  //   const response = await this.authService.login(req.user.id);
  //   res.redirect(`http://localhost:5173?token=${response.accessToken}`);
  // }
}
