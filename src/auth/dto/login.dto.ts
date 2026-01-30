import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

/**
 * DTO Login
 * login peut être un téléphone ou un email
 */
export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Le login (téléphone ou email) est requis' })
  login!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    { message: 'Le mot de passe doit contenir: 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial (@$!%*?&)' }
  )
  password!: string;
}
