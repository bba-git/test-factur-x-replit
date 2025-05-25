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
      .select('id, email, is_admin, is_active')
      .eq('id', session.user_id)
      .single();

    if (userError || !user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Get the company profile
    const { data: company, error: companyError } = await supabase
      .from('company_profiles')
      .select('id')
      .limit(1)
      .single();

    if (companyError || !company) {
      return res.status(403).json({ message: 'No company profile found' });
    }

    // Attach user and company profile to request
    req.context = {
      user,
      companyProfileId: company.id
    };

    next();
  } catch (error) {
    console.error('Error in getAuthenticatedUser middleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 