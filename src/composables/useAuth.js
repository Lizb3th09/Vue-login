import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'

const _user = ref(JSON.parse(localStorage.getItem('user')) || null)

export function useAuth() {
  const isAuthenticated = computed(() => !!_user.value)
  const user = computed(() => _user.value)

  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user) {
      setUser(data.session.user)
    }
  })

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      setUser(session.user)
    } else {
      _user.value = null
      localStorage.removeItem('user')
    }
  })

  //  Función centralizada
  function setUser(u) {
    _user.value = {
      name: u.user_metadata?.name || u.email?.split('@')[0] || 'Usuario',
      email: u.email
    }

    localStorage.setItem('user', JSON.stringify(_user.value))
  }

  // ── LOGIN ──
  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    setUser(data.user)

    return { ok: true }
  }

  // ── REGISTER ──
  async function register(name, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    setUser(data.user)

    return { ok: true }
  }

  // ── LOGOUT ──
  async function logout() {
    await supabase.auth.signOut()
    _user.value = null
    localStorage.removeItem('user')
  }

  return {
    user,
    isAuthenticated,
    login,
    logout,
    register
  }
}