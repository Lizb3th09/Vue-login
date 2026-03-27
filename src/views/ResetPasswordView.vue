<template>
  <div class="reset-page">
    <div class="card">
      <div class="card-header">
        <span class="icon">🔒</span>
        <h1>Nueva contraseña</h1>
        <p>Escribe tu nueva contraseña</p>
      </div>

      <input
        v-model="password"
        type="password"
        placeholder="Nueva contraseña"
      />

      <button @click="handleUpdate" :disabled="loading || !password">
        {{ loading ? 'Guardando...' : 'Actualizar contraseña' }}
      </button>

      <p v-if="msg" class="success">{{ msg }}</p>
      <p v-if="error" class="error">{{ error }}</p>

      <RouterLink to="/login" class="back-link">Volver al login</RouterLink>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'vue-router'

const router = useRouter()
const password = ref('')
const loading = ref(false)
const msg = ref('')
const error = ref('')

async function handleUpdate() {
  if (!password.value) {
    error.value = 'Ingresa una contraseña'
    return
  }

  loading.value = true
  msg.value = ''
  error.value = ''

  try {
    const { error: err } = await supabase.auth.updateUser({ password: password.value })
    loading.value = false

   if (!err) {
  msg.value = 'Contraseña actualizada ✅'

  // Intentamos cerrar la ventana después de 0.5s
  setTimeout(() => {
    window.close()   // cierra la ventana si se abre desde el email
    // Si  la pagina ya estaba abierta redirige al login
    if (!window.closed) router.push('/login')
  }, 500)
}
  } catch (e) {
    loading.value = false
    error.value = 'Ocurrió un error, intenta de nuevo.'
  }
}
</script>

<style scoped>
.reset-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(-45deg, #0d0d0d, #111, #1a1a1a, #222);
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

.card-header h1 {
  font-size: 1.5rem;
  background: linear-gradient(135deg, #e8e4dc, #6eb4e8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0.3rem 0 0.5rem 0;
}

.card-header p {
  color: #6b6560;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
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
}

button {
  width: 100%;
  padding: 0.7rem;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #6eb4e8, #4a90c4);
  font-weight: bold;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success {
  color: #6fcf97;
  margin-top: 1rem;
}

.error {
  color: #e07070;
  margin-top: 1rem;
}

.back-link {
  display: block;
  margin-top: 1.5rem;
  color: #6eb4e8;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}
</style>