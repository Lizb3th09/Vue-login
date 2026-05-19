<template>
  <div class="app">
    <!-- Sidebar - Más pequeña -->
    <aside class="sidebar">
      <div class="logo">
        <div class="logo-icon"></div>
        <h2>MIRA</h2>
      </div>

      <div class="system-status">
        <div class="status-item">
          <span class="status-dot"></span>
          <span>Sistema Activo</span>
        </div>
        <div class="status-item">
          <span>📹 {{ fps }} FPS</span>
        </div>
      </div>

      <div class="user-section">
        <div class="user-header">
          <h3>👥 Escaneos</h3>
          <button @click="agregarNuevoUsuario" class="add-user-btn">+</button>
        </div>
        <div class="user-list">
          <div 
            v-for="user in usuariosRegistrados" 
            :key="user.id"
            class="user-item"
            :class="{ selected: usuarioSeleccionado && usuarioSeleccionado.id === user.id }"
          >
            <div class="user-avatar" @click="seleccionarUsuarioRegistrado(user)">
              {{ user.nombre.charAt(0).toUpperCase() }}
            </div>
            <div class="user-info" @click="seleccionarUsuarioRegistrado(user)">
              <div class="user-name">{{ user.nombre }}</div>
            </div>
            <div class="user-actions">
              <button @click="editarUsuario(user)" class="user-edit" title="Editar">✏️</button>
              <button @click="eliminarUsuario(user)" class="user-delete" title="Eliminar">🗑️</button>
            </div>
          </div>
          <div v-if="usuariosRegistrados.length === 0" class="empty-users">
            <span>No hay usuarios</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content - Más ancho -->
    <main class="main">
      <!-- Header -->
      <header class="header">
        <div class="title">
          <h1>Monitoreo Inteligente</h1>
          <p>Detección facial en tiempo real</p>
        </div>
        <div class="datetime">
          <span>📅 {{ fechaActual }}</span>
        </div>
      </header>

      <!-- Grid Principal: Video + Alertas -->
      <div class="main-grid">
        <!-- Video Stream - MÁS GRANDE -->
        <div class="video-section">
          <div class="video-header">
            <div class="live-indicator">
              <span class="live-dot"></span>
              <span>EN VIVO</span>
            </div>
            <div class="video-controls">
              <select v-model="camaraSeleccionada" @change="cambiarCamara" class="camara-select" title="Seleccionar cámara">
                <option v-for="cam in camarasDisponibles" :key="cam.deviceId" :value="cam.deviceId">
                  📷 {{ cam.label || `Cámara ${cam.index + 1}` }}
                </option>
                <option v-if="camarasDisponibles.length === 0" disabled>🔍 No hay cámaras disponibles</option>
              </select>
              <button @click="alternarCamara" class="camara-btn" :class="{ active: camaraEncendida }">
                {{ camaraEncendida ? '🔴 Apagar' : '🟢 Prender' }}
              </button>
            </div>
          </div>
          <div class="video-container">
            <video 
              ref="videoLocal"
              autoplay 
              playsinline 
              muted
              class="video-stream"
              v-show="camaraEncendida"
            ></video>
            <div v-show="!camaraEncendida" class="video-off">
              <div class="off-content">
                <div class="off-icon">📷</div>
                <p>Cámara apagada</p>
                <small>Presiona "Prender" para activar</small>
              </div>
            </div>
            <canvas 
              ref="canvasOverlay" 
              :width="1400" 
              :height="900"
              class="overlay"
            ></canvas>
          </div>
        </div>

        <!-- Alertas de Desconocidos -->
        <div class="alerts-section">
          <div class="section-header">
            <h3>⚠️ Alertas</h3>
            <span class="alert-count">{{ historial.filter(h => !h.es_conocido).length }}</span>
          </div>
          <div class="alerts-list" ref="historialLista">
            <div 
              v-for="det in historial.filter(h => !h.es_conocido)" 
              :key="det.id"
              class="alert-item"
              @click="seleccionarUsuario(det)"
            >
              <div class="alert-icon">❓</div>
              <div class="alert-details">
                <div class="alert-time">{{ det.hora }}</div>
                <div class="alert-date">{{ det.fecha }}</div>
              </div>
            </div>
            <div v-if="historial.filter(h => !h.es_conocido).length === 0" class="no-alerts">
              <span>✅ Sin alertas</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Info Usuario Seleccionado -->
      <div v-if="usuarioSeleccionado" class="selected-info">
        <span>📌 Seleccionado:</span>
        <strong :style="{ color: usuarioSeleccionado.es_conocido ? '#10b981' : '#ef4444' }">
          {{ usuarioSeleccionado.nombre }}
        </strong>
        <span v-if="!usuarioSeleccionado.es_conocido" class="selected-hint">
          👆 Haz clic en "+" para registrar
        </span>
      </div>
    </main>
  </div>
</template>

<script>
export default {
  name: 'FaceGuard',
  data() {
    return {
      ws: null,
      conectado: false,
      imagenActual: null,
      deteccionesActuales: [],
      historial: [],
      usuariosRegistrados: [],
      fps: 0,
      ultimoFrameTime: Date.now(),
      frameCount: 0,
      fechaActual: new Date().toLocaleString(),
      streamLocal: null,
      capturaInterval: null,
      camaraEncendida: true,
      usuarioSeleccionado: null,
      camarasDisponibles: [],
      camaraSeleccionada: null
    }
  },
  
  mounted() {
    this.listarCamaras();
    this.conectarWebSocket();
    this.actualizarFecha();
    
    // Escuchar cambios en dispositivos (cámaras USB conectadas/desconectadas)
    navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange);
  },
  
  beforeUnmount() {
    if (this.ws) this.ws.close();
    if (this.capturaInterval) clearInterval(this.capturaInterval);
    if (this.streamLocal) this.streamLocal.getTracks().forEach(track => track.stop());
    
    // Remover event listener
    navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChange);
  },
  
  watch: {
    camarasDisponibles: {
      handler(nuevas, viejas) {
        if (viejas && nuevas.length > viejas.length) {
          this.mostrarMensaje('📷 Nueva cámara USB detectada', 'info');
        } else if (viejas && nuevas.length < viejas.length) {
          this.mostrarMensaje('🔌 Cámara desconectada', 'error');
        }
      },
      deep: true
    }
  },
  
  methods: {
    handleDeviceChange() {
      console.log('Dispositivos cambiados - detectando nueva cámara USB');
      this.listarCamaras();
    },
    
    async listarCamaras() {
      try {
        // Verificar si ya tenemos permisos
        let tienePermisos = false;
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasVideo = devices.some(d => d.kind === 'videoinput' && d.label);
          if (!hasVideo) {
            // Solo pedir permisos si no tenemos etiquetas (sin permisos previos)
            await navigator.mediaDevices.getUserMedia({ video: true });
          }
          tienePermisos = true;
        } catch (err) {
          console.warn('No se pudieron obtener permisos automáticamente');
        }
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // Guardar la cámara seleccionada actualmente
        const camaraAnterior = this.camaraSeleccionada;
        
        this.camarasDisponibles = videoDevices.map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Cámara ${index + 1}`,
          index: index
        }));
        
        // Si hay cámaras disponibles
        if (this.camarasDisponibles.length > 0) {
          // Si la cámara anterior ya no existe o no hay seleccionada, usar la primera
          const camaraExiste = this.camarasDisponibles.some(c => c.deviceId === camaraAnterior);
          
          if (!camaraExiste || !this.camaraSeleccionada) {
            this.camaraSeleccionada = this.camarasDisponibles[0].deviceId;
            if (this.camaraEncendida) {
              await this.iniciarCamaraLocal();
            }
          } else if (this.camaraEncendida && camaraAnterior === this.camaraSeleccionada) {
            // Si ya estábamos usando una cámara que sigue disponible, mantenerla
            // pero refrescar el stream si es necesario
            if (!this.streamLocal || this.streamLocal.getTracks().length === 0) {
              await this.iniciarCamaraLocal();
            }
          }
        } else {
          // No hay cámaras disponibles
          if (this.camaraEncendida) {
            this.alternarCamara(); // Apagar cámara
          }
          this.mostrarMensaje('No se detectaron cámaras', 'error');
        }
        
        console.log(`Cámaras encontradas: ${this.camarasDisponibles.length}`);
      } catch (error) {
        console.error('Error al listar cámaras:', error);
        this.camaraEncendida = false;
      }
    },
    
    async iniciarCamaraLocal() {
      try {
        if (this.streamLocal) {
          this.streamLocal.getTracks().forEach(track => track.stop());
        }
        
        const constraints = {
          video: this.camaraSeleccionada ? {
            deviceId: { exact: this.camaraSeleccionada },
            width: { ideal: 1400 },
            height: { ideal: 900 }
          } : {
            width: { ideal: 1400 },
            height: { ideal: 900 }
          }
        };
        
        this.streamLocal = await navigator.mediaDevices.getUserMedia(constraints);
        const videoElement = this.$refs.videoLocal;
        videoElement.srcObject = this.streamLocal;
        this.camaraEncendida = true;
        this.iniciarCapturaFrames();
      } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        this.camaraEncendida = false;
        this.mostrarMensaje('Error al acceder a la cámara: ' + error.message, 'error');
      }
    },
    
    async cambiarCamara() {
      if (this.camaraEncendida) {
        await this.iniciarCamaraLocal();
      }
    },
    
    alternarCamara() {
      if (this.camaraEncendida) {
        if (this.streamLocal) {
          this.streamLocal.getTracks().forEach(track => track.stop());
          this.streamLocal = null;
        }
        if (this.capturaInterval) {
          clearInterval(this.capturaInterval);
          this.capturaInterval = null;
        }
        this.camaraEncendida = false;
      } else {
        this.iniciarCamaraLocal();
      }
    },
    
    iniciarCapturaFrames() {
      const video = this.$refs.videoLocal;
      const canvas = document.createElement('canvas');
      canvas.width = 1400;
      canvas.height = 900;
      const ctx = canvas.getContext('2d');
      
      if (this.capturaInterval) clearInterval(this.capturaInterval);
      
      this.capturaInterval = setInterval(() => {
        if (video && video.readyState === video.HAVE_ENOUGH_DATA && this.ws && this.ws.readyState === WebSocket.OPEN && this.camaraEncendida) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frameData = canvas.toDataURL('image/jpeg', 0.8);
          const base64Data = frameData.split(',')[1];
          
          this.ws.send(JSON.stringify({
            tipo: 'frame',
            frame: base64Data
          }));
        }
      }, 100);
    },
    
    conectarWebSocket() {
      this.ws = new WebSocket('ws://localhost:8765');
      
      this.ws.onopen = () => {
        console.log('Conectado al servidor IA');
        this.conectado = true;
        this.solicitarUsuarios();
      };
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.tipo === 'stream_actualizacion') {
          this.deteccionesActuales = data.detecciones;
          
          if (data.historial_eventos && data.historial_eventos.length > 0) {
            this.agregarAlHistorial(data.historial_eventos);
          }
          
          this.calcularFPS();
          
          this.$nextTick(() => {
            this.dibujarRectangulos();
          });
        } else if (data.tipo === 'lista_usuarios') {
          this.usuariosRegistrados = data.usuarios;
        } else if (data.tipo === 'respuesta_registro') {
          this.manejarRespuestaServidor(data);
        } else if (data.tipo === 'respuesta_eliminacion') {
          this.manejarRespuestaServidor(data);
        } else if (data.tipo === 'respuesta_edicion') {
          this.manejarRespuestaServidor(data);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('Error WebSocket:', error);
      };
      
      this.ws.onclose = () => {
        console.log('Desconectado. Reconectando...');
        this.conectado = false;
        setTimeout(() => this.conectarWebSocket(), 3000);
      };
    },
    
    solicitarUsuarios() {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ tipo: 'solicitar_usuarios' }));
      }
    },
    
    agregarAlHistorial(nuevosEventos) {
      for (const evento of nuevosEventos) {
        if (!this.historial.some(h => h.id === evento.id)) {
          this.historial.unshift(evento);
        }
      }
      
      this.$nextTick(() => {
        if (this.$refs.historialLista) {
          this.$refs.historialLista.scrollTop = 0;
        }
      });
    },
    
    dibujarRectangulos() {
      const canvas = this.$refs.canvasOverlay;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      this.deteccionesActuales.forEach(det => {
        const [x1, y1, x2, y2] = det.bbox;
        const esConocido = det.nombre !== 'Desconocido';
        
        ctx.strokeStyle = esConocido ? '#10b981' : '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        
        const texto = det.nombre;
        ctx.font = 'bold 16px "Segoe UI"';
        const medidasTexto = ctx.measureText(texto);
        const anchoTexto = medidasTexto.width + 16;
        
        ctx.fillStyle = esConocido ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)';
        ctx.fillRect(x1, y1 - 32, anchoTexto, 32);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(texto, x1 + 8, y1 - 10);
        
        if (!canvas.hasClickListener) {
          canvas.hasClickListener = true;
          canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            for (const deteccion of this.deteccionesActuales) {
              const [x1, y1, x2, y2] = deteccion.bbox;
              if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
                this.seleccionarUsuario(deteccion);
                break;
              }
            }
          });
        }
      });
    },
    
    calcularFPS() {
      this.frameCount++;
      const ahora = Date.now();
      const delta = ahora - this.ultimoFrameTime;
      
      if (delta >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.ultimoFrameTime = ahora;
      }
    },
    
    seleccionarUsuario(deteccion) {
      const deteccionCompleta = this.historial.find(h => h.id === deteccion.id);
      if (deteccionCompleta) {
        if (this.usuarioSeleccionado && this.usuarioSeleccionado.id === deteccionCompleta.id) {
          this.usuarioSeleccionado = null;
        } else {
          this.usuarioSeleccionado = deteccionCompleta;
          this.mostrarMensaje(`Seleccionado: ${deteccionCompleta.nombre}`, 'info');
        }
      }
    },
    
    seleccionarUsuarioRegistrado(user) {
      if (this.usuarioSeleccionado && this.usuarioSeleccionado.id === user.id) {
        this.usuarioSeleccionado = null;
      } else {
        this.usuarioSeleccionado = user;
        this.mostrarMensaje(`Seleccionado: ${user.nombre}`, 'info');
      }
    },
    
    agregarNuevoUsuario() {
      if (!this.usuarioSeleccionado) {
        alert('Primero selecciona una persona en el video (haz clic sobre el rectángulo)');
        return;
      }
      
      if (this.usuarioSeleccionado.es_conocido) {
        alert('Este usuario ya está registrado. Use editar para cambiar el nombre.');
        return;
      }
      
      const nombre = prompt('Ingrese el nombre para este usuario:', 'Usuario_' + Date.now());
      
      if (nombre && nombre.trim()) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            tipo: 'registrar_usuario',
            nombre: nombre.trim(),
            usuario_id: this.usuarioSeleccionado.id,
            timestamp: this.usuarioSeleccionado.timestamp
          }));
          this.mostrarMensaje('Registrando usuario...', 'info');
        }
      }
    },
    
    editarUsuario(user) {
      const nuevoNombre = prompt('Ingrese el nuevo nombre:', user.nombre);
      if (nuevoNombre && nuevoNombre.trim() && nuevoNombre !== user.nombre) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            tipo: 'editar_usuario',
            usuario_id: user.id,
            nombre_actual: user.nombre,
            nombre_nuevo: nuevoNombre.trim()
          }));
          this.mostrarMensaje('Editando nombre...', 'info');
        }
      }
    },
    
    eliminarUsuario(user) {
      if (confirm(`¿Eliminar al usuario "${user.nombre}" permanentemente?`)) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            tipo: 'eliminar_usuario',
            usuario_id: user.id,
            nombre: user.nombre
          }));
          this.mostrarMensaje('Eliminando usuario...', 'info');
        }
      }
    },
    
    manejarRespuestaServidor(data) {
      if (data.exito) {
        this.mostrarMensaje(data.mensaje, 'exito');
        this.solicitarUsuarios();
        
        if (data.tipo === 'respuesta_registro' && data.usuario_actualizado) {
          this.actualizarUsuarioEnHistorial(data.usuario_actualizado);
          this.usuarioSeleccionado = null;
        } else if (data.tipo === 'respuesta_edicion' && data.usuario_actualizado) {
          this.actualizarUsuarioEnHistorial(data.usuario_actualizado);
        } else if (data.tipo === 'respuesta_eliminacion') {
          if (this.usuarioSeleccionado && this.usuarioSeleccionado.id === data.usuario_eliminado?.id) {
            this.usuarioSeleccionado = null;
          }
        }
      } else {
        this.mostrarMensaje(data.mensaje || 'Error en la operación', 'error');
      }
    },
    
    actualizarUsuarioEnHistorial(usuarioActualizado) {
      const index = this.historial.findIndex(h => h.id === usuarioActualizado.id);
      if (index !== -1) {
        this.historial[index].nombre = usuarioActualizado.nombre;
        this.historial[index].es_conocido = true;
        if (this.usuarioSeleccionado && this.usuarioSeleccionado.id === usuarioActualizado.id) {
          this.usuarioSeleccionado = this.historial[index];
        }
      }
    },
    
    mostrarMensaje(mensaje, tipo) {
      const toast = document.createElement('div');
      toast.className = `toast ${tipo}`;
      toast.textContent = mensaje;
      document.body.appendChild(toast);
      
      setTimeout(() => toast.classList.add('show'), 100);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
    },
    
    actualizarFecha() {
      setInterval(() => {
        this.fechaActual = new Date().toLocaleString();
      }, 1000);
    }
  }
}
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app {
  display: flex;
  height: 100vh;
  background: #0a0e27;
  font-family: 'Segoe UI', 'Inter', sans-serif;
}

/* Sidebar - MÁS PEQUEÑA */
.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #0f122e 0%, #0a0e27 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-icon {
  font-size: 28px;
}

.logo h2 {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.logo span {
  background: none;
  -webkit-text-fill-color: #fff;
}

.system-status {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 10px;
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}

.status-dot {
  width: 6px;
  height: 6px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.user-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.user-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 4px;
}

.user-header h3 {
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.add-user-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-user-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
}

.user-list {
  flex: 1;
  overflow-y: auto;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  margin-bottom: 6px;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.user-item:hover {
  background: rgba(102, 126, 234, 0.15);
}

.user-item.selected {
  background: rgba(102, 126, 234, 0.2);
  border-color: #667eea;
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 14px;
}

.user-info {
  flex: 1;
  cursor: pointer;
}

.user-name {
  color: #fff;
  font-weight: 600;
  font-size: 12px;
}

.user-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.user-edit, .user-delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.user-edit {
  color: #667eea;
}

.user-edit:hover {
  background: rgba(102, 126, 234, 0.2);
  transform: scale(1.1);
}

.user-delete {
  color: #ef4444;
}

.user-delete:hover {
  background: rgba(239, 68, 68, 0.2);
  transform: scale(1.1);
}

.empty-users {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
}

/* Main Content */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px 28px;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title h1 {
  color: #fff;
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 2px;
}

.title p {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
}

.datetime {
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.05);
  padding: 6px 14px;
  border-radius: 10px;
  font-size: 13px;
}

/* Main Grid - Video más grande */
.main-grid {
  display: grid;
  grid-template-columns: 1.3fr 260px;
  gap: 20px;
  flex: 1;
  min-height: 0;
  margin-bottom: 16px;
}

/* Video Section - MÁS GRANDE */
.video-section {
  background: rgba(0, 0, 0, 0.5);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
}

.video-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 18px;
  background: rgba(0, 0, 0, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.live-dot {
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  animation: pulse 1s infinite;
}

.live-indicator span {
  color: #ef4444;
  font-weight: bold;
  font-size: 11px;
  letter-spacing: 1px;
}

.video-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.camara-select {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  outline: none;
}

.camara-select:hover {
  background: rgba(255, 255, 255, 0.15);
}

.camara-select option {
  background: #0f122e;
}

.camara-btn {
  padding: 4px 14px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #ef4444;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 11px;
  transition: all 0.3s;
}

.camara-btn.active {
  background: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
  color: #10b981;
}

.camara-btn:hover {
  transform: translateY(-1px);
}

.video-container {
  position: relative;
  flex: 1;
  background: #000;
  min-height: 580px;
}

.video-stream {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-off {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0e27;
  text-align: center;
}

.off-content {
  text-align: center;
}

.off-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.off-content p {
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
  font-size: 13px;
}

.off-content small {
  color: rgba(255, 255, 255, 0.3);
  font-size: 10px;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto;
  cursor: crosshair;
}

/* Alertas Section */
.alerts-section {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.section-header h3 {
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.alert-count {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.alerts-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.alert-item {
  display: flex;
  gap: 10px;
  padding: 10px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  margin-bottom: 6px;
  border-left: 3px solid #ef4444;
  transition: all 0.2s;
  cursor: pointer;
}

.alert-item:hover {
  background: rgba(239, 68, 68, 0.15);
  transform: translateX(-3px);
}

.alert-icon {
  font-size: 24px;
}

.alert-details {
  flex: 1;
}

.alert-time {
  color: #fff;
  font-weight: 600;
  font-size: 12px;
  margin-bottom: 2px;
}

.alert-date {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.no-alerts {
  text-align: center;
  padding: 30px 16px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

.selected-info {
  background: rgba(102, 126, 234, 0.1);
  padding: 8px 12px;
  border-radius: 8px;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.selected-info strong {
  margin-left: 6px;
}

.selected-hint {
  margin-left: 10px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

/* Toast */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 10px 20px;
  border-radius: 8px;
  background: #1f2937;
  color: #fff;
  z-index: 1000;
  opacity: 0;
  transform: translateY(100px);
  transition: all 0.3s;
  font-size: 13px;
}

.toast.show {
  opacity: 1;
  transform: translateY(0);
}

.toast.exito { background: #10b981; }
.toast.error { background: #ef4444; }
.toast.info { background: #667eea; }

/* Scrollbar */
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>