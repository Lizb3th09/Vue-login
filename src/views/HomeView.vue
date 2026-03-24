<template>
  <div class="home">
    <section class="hero">
  
      <div class="hero-bg">
        <img 
          src="https://i.pinimg.com/originals/6b/1d/9c/6b1d9c94f0e4829cbc4de9c1ac35e3d3.gif" 
          alt="Fondo GIF" 
          class="gif-bg"
        >
      </div>

      <canvas id="particles"></canvas>    
   
      <div class="hero-content">
        <h1 class="hero-title">
          LCK <span>Detector</span>
        </h1>
        <p class="hero-desc">
          Sistema de detector de gas.
        </p>

        <div class="hero-actions">
          <RouterLink v-if="!isAuthenticated" to="/login" class="btn primary">
            Iniciar sesión 
          </RouterLink>
          <RouterLink v-else to="/dashboard" class="btn primary">
            Ir al Dashboard 
          </RouterLink>
        </div>
      </div>
    </section>

    
    <section class="features">
      <div
        v-for="feat in features"
        :key="feat.title"
        class="card"
      >
        <div class="icon">{{ feat.icon }}</div>
        <h3>{{ feat.title }}</h3>
        <p>{{ feat.desc }}</p>
      </div>
    </section>

  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const { isAuthenticated } = useAuth()

const features = [
  { icon: '🔥 Detección', desc: 'Monitorea continuamente la presencia de gases inflamables como LPG, metano o propano.' },
  { icon: '⚡Alertas',  desc: 'Recibe notificaciones inmediatas en caso de fuga de gas para prevenir accidentes.' },
  { icon: '🛡️ Seguridad ', desc: 'Protección confiable tanto en entornos domésticos como industriales.' },
]

onMounted(() => {
  const canvas = document.getElementById('particles')
  const ctx = canvas.getContext('2d')
  canvas.width = canvas.offsetWidth
  canvas.height = canvas.offsetHeight

  const mouse = { x: null, y: null }
  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX - canvas.getBoundingClientRect().left
    mouse.y = e.clientY - canvas.getBoundingClientRect().top
  })

  const particles = Array.from({length: 100}, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 3 + 1,
    dx: (Math.random() - 0.5) * 0.5,
    dy: (Math.random() - 0.5) * 0.5
  }))

  function animate() {
    ctx.clearRect(0,0,canvas.width,canvas.height)
    particles.forEach(p => {
      if(mouse.x && mouse.y){
        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const dist = Math.sqrt(dx*dx + dy*dy)
        if(dist < 100){
          p.x -= dx/30
          p.y -= dy/30
        }
      }

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2)
      ctx.fillStyle = 'rgba(188,87,255,0.7)'
      ctx.fill()
      p.x += p.dx
      p.y += p.dy
      if(p.x < 0 || p.x > canvas.width) p.dx *= -1
      if(p.y < 0 || p.y > canvas.height) p.dy *= -1
    })
    requestAnimationFrame(animate)
  }
  animate()
})
</script>

<style scoped>
.home {
  font-family: 'Inter', sans-serif;
  color: #fff;
  background-color: #0b000d00; 
}

.hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 45vh;
  overflow: hidden;
  text-align: center;
}

.hero-bg {
  position:absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #086b7af3; 
  overflow: hidden;
}

.gif-bg {
  width: 100%;
  height: 100%;
  object-fit: cover;

 
  background-color: #000000;
  mix-blend-mode:color-burn;
}

#particles {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 1;
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 800px;
  padding: 2rem;
}

.hero-title {
  font-size: clamp(3rem, 6vw, 4rem);
  font-weight: 900;
  color: #fff;
  animation: fadeIn 1.5s ease forwards;
}

.hero-title span {
  background: linear-gradient(135deg, #3b82f6, #9333ea);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-desc {
  margin-top: 1rem;
  color: #bbb;
  font-size: 1.1rem;
  animation: fadeIn 2s ease forwards;
}

.hero-actions {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  animation: fadeIn 2.5s ease forwards;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem 1.8rem;
  border-radius: 14px;
  font-weight: 700;
  text-decoration: none;
  position: relative;
  overflow: hidden;
  transition: all 0.4s ease;
}

.primary {
  background: linear-gradient(135deg, #bc57ff, #3b82f6);
  color: white;
}

.primary::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(45deg, rgba(255,255,255,0.25), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.primary:hover::after {
  transform: translateX(100%);
}

.primary:hover {
  transform: scale(1.1);
}

@keyframes fadeIn {
  0% { opacity: 0; transform: translateY(20px);}
  100% { opacity: 1; transform: translateY(0);}
}

.features {
  display: grid;
  color: rgb(255, 255, 255);
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.8rem;
  padding: 3rem 1.5rem;
}

.card {
   border: 1px solid rgb(242, 241, 242);
  padding: 1.8rem;
  border-radius: 18px;
  background: rgba(17, 16, 16, 0.368); 
  backdrop-filter: blur(8px);
  transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1); 
}

.card:hover {
  transform: translateY(-10px) scale(1.05);
  border: 1px solid #bc57ff;
  box-shadow: 
    0 0 15px rgba(188,87,255,0.5),
    0 0 30px rgba(59,130,246,0.3);
}
.icon {
  font-size: 2.2rem;
  margin-bottom: 0.5rem;
}

h3 { color: #fff; }
p { color: #ffffff; font-size: 0.9rem; }
</style>