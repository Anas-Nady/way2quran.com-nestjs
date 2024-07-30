import { Controller, Post, Body, Patch, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UpdateAuthDto } from './dto/update-account.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5 } })
  @Post('login')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.singIn(signInDto);
  }

  @Post('register')
  singUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Patch('update-profile')
  update(@Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.updateUser(updateAuthDto);
  }

  @Get('get-profile')
  getCurrentUser(@Req() req) {
    return this.authService.getCurrentUser(req);
  }
}
