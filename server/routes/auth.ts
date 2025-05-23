import { Router } from 'express';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: email,
        password_hash: passwordHash,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      return res.status(500).json({ message: 'Failed to create user record' });
    }

    // Create session
    const sessionToken = uuidv4();
    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return res.status(500).json({ message: 'Failed to create session' });
    }

    // Set session cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ 
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Get the user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, password_hash, is_admin, is_active, created_at, updated_at')
      .eq('email', email)
      .single();

    console.log('[LOGIN DEBUG] User from DB:', user);
    if (userError) {
      console.log('[LOGIN DEBUG] userError:', userError);
    }

    if (userError || !user) {
      console.log('[LOGIN DEBUG] User not found for email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Debug: log provided password and stored hash (REMOVE in production)
    console.log('[LOGIN DEBUG] Provided password:', password);
    console.log('[LOGIN DEBUG] Stored hash:', user.password_hash);

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('[LOGIN DEBUG] bcrypt.compare result:', isValidPassword);
    if (!isValidPassword) {
      console.log('[LOGIN DEBUG] Password mismatch for user:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create session
    const sessionToken = uuidv4();
    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return res.status(500).json({ message: 'Failed to create session' });
    }

    // Set session cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  const sessionToken = req.cookies?.session_token;

  if (sessionToken) {
    try {
      // Delete session from database
      await supabase
        .from('sessions')
        .delete()
        .eq('session_token', sessionToken);
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }

  // Clear session cookie
  res.clearCookie('session_token');
  res.json({ message: 'Logged out successfully' });
});

export default router; 