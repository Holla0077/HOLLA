-- Add new values to the existing enum type
ALTER TYPE "VerificationStatus" ADD VALUE 'UNVERIFIED';
ALTER TYPE "VerificationStatus" ADD VALUE 'VERIFIED';