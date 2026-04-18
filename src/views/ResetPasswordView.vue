<template>
  <div class="reset-page">
    <div class="card">
      <!-- Estado de verificación -->
      <div v-if="verifying" class="card-header">
        <span class="icon">🔍</span>
        <h1>Verificando enlace</h1>
        <p>Por favor espera un momento...</p>
      </div>

      <!-- Formulario solo si el token es válido -->
      <template v-else-if="isValidToken">
        <div class="card-header">
          <span class="icon">🔒</span>
          <h1>Nueva contraseña</h1>
          <p>Escribe tu nueva contraseña</p>
        </div>

        <input
          v-model="password"
          type="password"
          placeholder="Nueva contraseña (mínimo 6 caracteres)"
          @input="clearMessages"
        />

        <button @click="handleUpdate" :disabled="loading || !password || password.length < 6">
          {{ loading ? 'Guardando...' : 'Actualizar contraseña' }}
        </button>

        <p v-if="msg" class="success">{{ msg }}</p>
        <p v-if="error" class="error">{{ error }}</p>
        
      </template>

      <!-- Token inválido o expirado - Solo muestra error, no el formulario -->
      <div v-else-if="!verifying && !isValidToken" class="error-container">
        <div class="card-header">
          <span class="error-icon">⚠️</span>
          <h1 class="error-title">Enlace inválido</h1>
          <p class="error-subtitle">No se puede restablecer la contraseña</p>
        </div>
        
        <div class="error-message-box">
          <p>Este enlace ya fue usado o ha caducado.</p>
          <p>Solicita un nuevo restablecimiento de contraseña.</p>
        </div>
        
        <RouterLink to="/" class="retry-link">
          Volver al home
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'vue-router'

const router = useRouter()
const password = ref('')
const loading = ref(false)
const msg = ref('')
const error = ref('')
const verifying = ref(true)
const isValidToken = ref(false)

// Limpiar mensajes
function clearMessages() {
  msg.value = ''
  error.value = ''
}

// Verificar si hay un token válido en la URL
async function verifyToken() {
  verifying.value = true
  
  // Obtener el token de la URL (hash fragment)
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')
  const type = hashParams.get('type')

  // Caso 1: No hay token en la URL (acceso directo)
  if (!accessToken || type !== 'recovery') {
    console.warn('Acceso directo a reset-password sin token válido')
    isValidToken.value = false
    verifying.value = false
    return
  }

  // Caso 2: Verificar si el token es válido
  try {
    // Intentar establecer la sesión con el token
    const { data, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    if (sessionError || !data.session) {
      console.error('Token inválido o expirado:', sessionError)
      isValidToken.value = false
      verifying.value = false
      return
    }

    // Token válido
    isValidToken.value = true
    verifying.value = false

    // Limpiar la URL para que no se vea el token
    window.history.replaceState({}, document.title, '/reset-password')

  } catch (error) {
    console.error('Error verificando token:', error)
    isValidToken.value = false
    verifying.value = false
  }
}

async function handleUpdate() {
  // Validaciones
  if (!password.value) {
    error.value = 'Ingresa una contraseña'
    return
  }

  if (password.value.length < 6) {
    error.value = 'La contraseña debe tener al menos 6 caracteres'
    return
  }

  loading.value = true
  msg.value = ''
  error.value = ''

  try {
    const { error: err } = await supabase.auth.updateUser({ 
      password: password.value 
    })

    if (err) {
      loading.value = false
      
      // Manejar diferentes tipos de errores
      if (err.message.includes('expired') || err.message.includes('token')) {
        error.value = 'El enlace ha expirado. Solicita uno nuevo.'
        isValidToken.value = false // Marcar como inválido
      } else if (err.message.includes('same as the old password')) {
        error.value = 'La nueva contraseña debe ser diferente a la anterior'
      } else if (err.message.includes('at least 6 characters')) {
        error.value = 'La contraseña debe tener al menos 6 caracteres'
      } else {
        error.value = err.message || 'Error al actualizar la contraseña'
      }
      return
    }

    // Éxito - actualización completada
    loading.value = false
    msg.value = 'Contraseña actualizada correctamente ✅'
    
    // Cerrar sesión para invalidar el token de recuperación
    await supabase.auth.signOut()
    
    // Redirigir o cerrar ventana después de 1.5 segundos
    setTimeout(() => {
      // Intentar cerrar la ventana (si se abrió desde el email)
      window.close()
      
      // Si no se pudo cerrar (pestaña normal), redirigir al home
      setTimeout(() => {
        if (!window.closed) {
          router.push('/')
        }
      }, 100)
    }, 1500)
    
  } catch (e) {
    loading.value = false
    console.error('Error inesperado:', e)
    error.value = 'Ocurrió un error de conexión. Verifica tu internet e intenta de nuevo.'
  }
}

// Verificar token al montar el componente
onMounted(() => {
  verifyToken()
})
</script>

<style scoped>
.reset-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;

  background-size: 400% 400%;
  animation: bgMove 15s ease infinite;
}

@keyframes bgMove {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.card {
  background: rgba(18,18,18,0.95);
  backdrop-filter: blur(10px);
  padding: 2rem;
  border-radius: 16px;
  color: white;
  width: 350px;
  text-align: center;
  border: 1px solid rgba(110,180,232,0.2);
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px);}
  to { opacity: 1; transform: translateY(0);}
}

.card-header {
  margin-bottom: 1.5rem;
}

.card-header h1 {
  font-size: 1.5rem;
  background: linear-gradient(135deg, #e8e4dc, #6eb4e8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0.3rem 0 0.5rem 0;
}

.card-header p {
  color: #6b6560;
  font-size: 0.9rem;
}

.icon {
  font-size: 2rem;
  color: #6eb4e8;
  display: block;
  margin-bottom: 0.5rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,100% { transform: scale(1);}
  50% { transform: scale(1.1);}
}

input {
  width: 100%;
  padding: 0.7rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
  color: #fff;
  font-size: 1rem;
  transition: all 0.3s ease;
}

input:focus {
  outline: none;
  border-color: #6eb4e8;
  background: rgba(255,255,255,0.1);
}

button {
  width: 100%;
  padding: 0.7rem;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #6eb4e8, #4a90c4);
  font-weight: bold;
  cursor: pointer;
  color: white;
  font-size: 1rem;
  transition: transform 0.2s ease;
}

button:hover:not(:disabled) {
  transform: translateY(-2px);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success {
  color: #6fcf97;
  margin-top: 1rem;
  padding: 0.5rem;
  background: rgba(111, 207, 151, 0.1);
  border-radius: 8px;
  animation: slideDown 0.3s ease;
}

.error {
  color: #e07070;
  margin-top: 1rem;
  padding: 0.5rem;
  background: rgba(224, 112, 112, 0.1);
  border-radius: 8px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.back-link {
  display: block;
  margin-top: 1.5rem;
  color: #6eb4e8;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: #8ec4f0;
  text-decoration: underline;
}

/* Estilos para error container - versión limpia */
.error-container {
  text-align: center;
}

.error-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.5rem;
}

.error-title {
  font-size: 1.5rem !important;
  background: linear-gradient(135deg, #e07070, #c04e4e) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
  margin-bottom: 0.5rem !important;
}

.error-subtitle {
  color: #6b6560;
  font-size: 0.9rem;
}

.error-message-box {
  background: rgba(224, 112, 112, 0.1);
  padding: 1rem;
  border-radius: 8px;
  margin: 1.5rem 0;
  border: 1px solid rgba(224, 112, 112, 0.2);
}

.error-message-box p {
  color: #e07070;
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.retry-link {
  display: inline-block;
  padding: 0.7rem 1.5rem;
  background: linear-gradient(135deg, #6eb4e8, #4a90c4);
  border-radius: 10px;
  color: white;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: bold;
  transition: all 0.2s ease;
  margin-top: 0.5rem;
}

.retry-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(110, 180, 232, 0.3);
}

.info {
  background: rgba(110, 180, 232, 0.1);
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  color: #6eb4e8;
  text-align: center;
  animation: pulse 1.5s infinite;
}
</style>