import {
  BadRequestException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './user.schema';
import { Model } from 'mongoose';
import { SignUpDto } from './dto/sign-up.dto';
import { UpdateAuthDto } from './dto/update-account.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { SignInDto } from './dto/sign-in.dto';
import { Request } from 'express-serve-static-core';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private User: Model<User>,
    private jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const { name, email, password, isAdmin } = signUpDto;

    const isExists = await this.User.findOne({ email });

    if (isExists) {
      throw new HttpException('Email already exists.', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.User.create({
      name,
      email,
      password: hashedPassword,
      isAdmin,
    });

    if (!user) {
      throw new HttpException('Invalid data input', 400);
    }

    const token = this.jwtService.sign({ id: user._id });

    return { token };
  }

  async singIn(signInDto: SignInDto) {
    const { email, password } = signInDto;

    const user = await this.User.findOne({ email }).select('+password');

    if (!user) {
      throw new HttpException(`This email: ${email} is not found`, 404);
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
      throw new UnauthorizedException('Invalid password');
    }

    const token = this.jwtService.sign({ id: user._id });

    return { token };
  }

  async updateUser(updateAuthDto: UpdateAuthDto) {
    try {
      const { currentEmail, newEmail, newPassword } = updateAuthDto;

      const user = await this.User.findOne({ email: currentEmail });

      if (!user) {
        throw new BadRequestException(`Please enter your email correctly.`);
      }

      if (newEmail) {
        user.email = newEmail;
      }
      if (newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
      }

      const updatedUser = await user.save();

      return {
        message: 'Your account has been updated successfully.',
        userEmail: updatedUser.email,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to update user: ${error.message}`,
        error.status,
      );
    }
  }

  async getCurrentUser(req: Request) {
    const token = req.headers.authorization.split(' ')[1]; // Bearer token
    if (!token) {
      throw new UnauthorizedException('No token found in headers.');
    }

    const decoded = this.jwtService.decode(token);

    const user = await this.User.findById(decoded?.id);
    if (!user) {
      throw new UnauthorizedException(
        'Invalid token or user not found. Please login first.',
      );
    }

    return {
      user,
      token,
    };
  }
}
