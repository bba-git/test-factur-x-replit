import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabaseClient';

export async function getAuthenticatedUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const sessionToken = req.cookies?.session_token;

  if (!sessionToken) {
    return res.status(401).json({ message: 'No session token provided' });
  }

  try {
    // Find the session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('user_id')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !session) {
      return res.status(401).json({ message: 'Invalid session' });
    }

    // Get the user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, company_profile_id')
      .eq('id', session.user_id)
      .single();

    if (userError || !user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user and company context to request
    req.context = {
      user,
      companyProfileId: user.company_profile_id
    };

    next();
  } catch (error) {
    console.error('Error in getAuthenticatedUser middleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 