import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { useApp } from "../context/AppContext";
import { fetchInvitationBySlug, incrementViewsRemote } from "../services/googleSheetsApi";
import { teamIdFromName, customTeamNameFrom } from "../data/teams";
import { whatsappLinks } from "../config/whatsapp";

// Las carpetas de Drive no son imágenes: si el link no es una foto, la ignoramos.
const validPhoto = (url) => {
  const value = String(url || '').trim();
  if (!value) return "";
  if (/\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(value)) return value;
  if (/drive\.google\.com\/.*[?&]id=/.test(value)) return value;
  if (/lh3\.googleusercontent\.com/.test(value)) return value;
  if (value.startsWith("data:image/")) return value;
  return "";
};
import AlbumCover from "../components/invitation/AlbumCover";
import PlayerCard from "../components/invitation/PlayerCard";
import EventInfo from "../components/invitation/EventInfo";
import CountdownTimer from "../components/invitation/CountdownTimer";
import SparkleField from "../components/brand/SparkleField.jsx";
import RSVPForm from "../components/invitation/RSVPForm";
import ShareButtons from "../components/invitation/ShareButtons";
import Watermark from "../components/invitation/Watermark";
import ReferralCta from "../components/invitation/ReferralCta";


// La demo siempre queda en una fecha futura para que el contador se vea completo.
function withDemoDate(invitation, slug) {
  if (!invitation || slug !== 'thiago-8-argentina') return invitation
  const now = new Date()
  const year = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
  return { ...invitation, date: `${year}-07-14`, time: '15:00 - 19:00' }
}

const InvitationPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { getEventBySlug, setCurrentInvitation } = useApp();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  // Si el link venció (12 meses), guardamos la fecha para avisar con claridad.
  const [expired, setExpired] = useState(null);
  const [error, setError] = useState(null);
  // Pedido sin pagar: se ve completo pero con marca de agua y aviso.
  const [esBorrador, setEsBorrador] = useState(false);
  // ¿Esta invitación la creó quien está mirando? Se recuerda en el navegador
  // apenas se crea el pedido, para que "Volver" nunca mande al panel de otro.
  const [esMio, setEsMio] = useState(false);

  const marcarDuenoDelPedido = () => {
    try {
      const suyo = Boolean(localStorage.getItem(`invitafigus_pedido_${slug}`))
        || Boolean(localStorage.getItem(`invitafigus_panel_${slug}`))
      setEsMio(suyo)
      return suyo
    } catch {
      return false
    }
  };

  const [showCard, setShowCard] = useState(false);
  const [albumOpened, setAlbumOpened] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const loadInvitation = async () => {
      setLoading(true);
      try {
        // modo=compartir → el pedido puede estar sin pagar y se muestra igual
        const remoteEvent = await fetchInvitationBySlug(slug, { modo: 'compartir' });

        // Link vencido (12 meses): aviso con salida, sin tratarlo como error.
        if (remoteEvent && remoteEvent.expired) {
          setExpired(remoteEvent.expires_at || '');
          setEvent(null);
          return;
        }

        if (remoteEvent) {
          const localData = JSON.parse(localStorage.getItem('invitafigus_data') || '{}');
          const localInv = localData.invitations?.find(inv => inv.slug === slug);
          const fotoFromAdmin = localStorage.getItem(`foto_${slug}`);
          
          // ← FIX: Leer campos con salto de linea al final (bug del Google Sheet)
          const apellido = remoteEvent['Apellido\n'] || remoteEvent.Apellido || remoteEvent.apellido || remoteEvent['Apellido '] || '';
          const apodo = remoteEvent['Apodo\n'] || remoteEvent.Apodo || remoteEvent.apodo || remoteEvent['Apodo '] || '';
          const mensaje = remoteEvent['Mensaje\n'] || remoteEvent.Mensaje || remoteEvent.mensaje || remoteEvent['Mensaje '] || '';
          const vestimenta = remoteEvent['Vestimenta\n'] || remoteEvent.Vestimenta || remoteEvent.vestimenta || remoteEvent['Vestimenta '] || '';
          
          // ← FIX: Agregar codigo de pais al telefono
          const telefono = (() => {
            let phone = String(remoteEvent.telefono || remoteEvent['Telefono\n'] || remoteEvent.Telefono || remoteEvent['Telefono '] || '').replace(/\D/g, '');
            if (phone.startsWith('0')) phone = phone.substring(1);
            if (!phone.startsWith('54')) phone = '54' + phone;
            return phone;
          })();
          
          // Los pedidos nuevos pueden no tener slug guardado: lo calculamos igual que el panel.
          const computedSlug = remoteEvent.slug || [remoteEvent.nombre, remoteEvent.edad, remoteEvent.equipo]
            .filter(Boolean).join('-')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

          const mappedEvent = {
            id: `inv-${computedSlug}`,
            slug: computedSlug,
            childName: remoteEvent.nombre,
            honoreeName: apellido,
            nickname: apodo,
            age: remoteEvent.edad,
            honoreeAge: remoteEvent.edad,
            team: teamIdFromName(remoteEvent.equipo || 'Argentina'),
            customTeamName: customTeamNameFrom(remoteEvent.equipo || ''),
            date: remoteEvent.fecha,
            time: remoteEvent.hora,
            address: remoteEvent.lugar,
            location: remoteEvent.lugar,
            dressCode: vestimenta,
            mapsUrl: remoteEvent.maps_url,
            contactWhatsApp: telefono,
            honoreePhoto: validPhoto(remoteEvent.foto_url) || validPhoto(fotoFromAdmin) || localInv?.honoreePhoto || (slug === 'thiago-8-argentina' ? '/ejemplos/thiago.webp' : ''),
            message: mensaje,
            status: String(remoteEvent.estado || '').toLowerCase(),
            views: remoteEvent.views,
            borrador: Boolean(remoteEvent.borrador),
          };
          setEsBorrador(Boolean(remoteEvent.borrador));
          marcarDuenoDelPedido();
          setEvent(withDemoDate(mappedEvent, slug));
          
          incrementViewsRemote(slug).catch(() => {});
        } else {
          // Sin respuesta del servidor (o pedido sin publicar): si la
          // invitación está guardada en ESTE navegador, el dueño la puede
          // seguir viendo y volver al pago.
          const localEvent = getEventBySlug(slug);
          setEvent(withDemoDate(localEvent, slug));
          if (localEvent) {
            marcarDuenoDelPedido();
            fetch(`/api/order?slug=${encodeURIComponent(slug)}`)
              .then((r) => r.json())
              .then((data) => { if (data?.order && !data.order.pagado) setEsBorrador(true) })
              .catch(() => {});
          }
        }
      } catch (err) {
        console.error('Error loading invitation:', err);
        const localEvent = getEventBySlug(slug);
        setEvent(withDemoDate(localEvent, slug));
        if (!localEvent) {
          setError('Invitación no encontrada');
        }
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [slug, getEventBySlug]);

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (audioRef.current) audioRef.current.volume = next ? 0 : 0.4;
  };

  const handleAlbumOpen = () => {
    setAlbumOpened(true);
    setShowCard(true);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.volume = muted ? 0 : 0.4;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleNavigateToCreate = () => {
    setCurrentInvitation(null);
    navigate('/crear');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40">Cargando invitación...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
            <span className="text-3xl">⏳</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Este link ya no está activo</h2>
          <p className="text-gray-400 mb-1">
            Las invitaciones duran 12 meses{expired ? ` (esta venció el ${expired})` : ''}.
          </p>
          <p className="text-gray-500 text-sm mb-6">Si es tu invitación, escribinos y la reactivamos sin costo.</p>
          <button
            onClick={() => window.open(whatsappLinks.support(), '_blank')}
            className="w-full px-6 py-3 bg-[#22c55e] text-white font-bold rounded-lg hover:bg-[#16a34a] transition-colors mb-3"
          >
            📱 Escribir por WhatsApp
          </button>
          <button
            onClick={() => navigate('/crear')}
            className="w-full px-6 py-3 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/5 transition-colors"
          >
            Crear una invitación nueva
          </button>
        </motion.div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
            <span className="text-3xl">⚽</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            ¡Creá tu invitación!
          </h2>
          <p className="text-gray-400 mb-6">
            Esta invitación está en proceso o aún no fue creada. Convertí a tu hijo o hija en la estrella del partido.
          </p>
          <button
            onClick={() => navigate('/crear')}
            className="w-full px-6 py-3 bg-[#FFD700] text-[#0a0e27] font-bold rounded-lg hover:bg-[#e6c200] transition-colors mb-3"
          >
            Crear mi invitación
          </button>
          <button
            onClick={() => window.open(whatsappLinks.missing(), '_blank')}
            className="w-full px-6 py-3 bg-[#22c55e] text-white font-bold rounded-lg hover:bg-[#16a34a] transition-colors"
          >
            📱 Consultar por WhatsApp
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e27] relative overflow-hidden">
      <audio ref={audioRef} preload="auto">
        <source src="/audio/estadio.mp3" type="audio/mpeg" />
      </audio>
      <button
        onClick={toggleMute}
        aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
        className="absolute right-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40 text-white/70 backdrop-blur transition hover:text-white"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00D4FF]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#FFD700]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-20 max-w-md mx-auto px-4 pt-4">
        {/* Volver al paso donde estabas. Si es tu propia invitación sin pagar
            volvés al pago; si ya está paga, a tu panel. Para un INVITADO
            (alguien que recibió el link) vuelve a la portada: antes les
            mandaba al inicio y se perdían. */}
        <button
          onClick={() => {
            const suyo = marcarDuenoDelPedido();
            // Sin pagar y es tuyo → a la pantalla de pago (Mercado Pago/WhatsApp).
            if (suyo && esBorrador) navigate(`/crear?status=pending&code=${encodeURIComponent(slug)}`);
            else if (suyo) navigate(`/panel/${slug}`);
            else navigate('/');
          }}
          className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          {esBorrador ? 'Volver al pago' : 'Volver'}
        </button>
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-4 pb-24">
        {esBorrador && (
          <div className="mb-4 rounded-2xl border border-[#FFD700]/40 bg-[#FFD700]/10 p-4 text-center">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#FFD700]">Vista previa · sin pagar</p>

            {esMio ? (
              <>
                <p className="mt-1 text-xs leading-relaxed text-white/60">
                  Así la ven tus invitados hasta que se acredite el pago. Podés compartirla igual:
                  ya pueden confirmar. La marca de agua desaparece sola al pagar.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    onClick={() => navigate(`/crear?status=pending&code=${encodeURIComponent(slug)}`)}
                    className="w-full rounded-lg bg-[#FFD700] px-3 py-2.5 text-xs font-bold text-[#0a0e27]"
                  >
                    Ir a pagar (Mercado Pago / WhatsApp)
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/invitacion/${slug}`;
                        navigator.clipboard.writeText(url).catch(() => {});
                        alert('Link copiado: ' + url);
                      }}
                      className="flex-1 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white/80"
                    >
                      Copiar link
                    </button>
                    <button
                      onClick={() => navigate(`/panel/${slug}`)}
                      className="flex-1 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white/80"
                    >
                      Mi panel
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-white/60">
                Esta invitación está en vista previa. Podés confirmar tu asistencia y dejarle un mensaje
                al cumpleañero: todo queda guardado.
              </p>
            )}
          </div>
        )}
        <AnimatePresence>
          {!albumOpened && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0, transition: { duration: 0.5 } }}
              className="mb-6"
            >
              <AlbumCover 
                honoreeName={event.childName || event.honoreeName} 
                team={event.team}
                customTeamName={event.customTeamName}
                photo={event.honoreePhoto}
                onOpen={handleAlbumOpen}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCard && (
            <motion.div
              initial={{ opacity: 0, y: 40, rotateX: -15 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="mb-6"
            >
              <div className="relative">
                <PlayerCard event={event} />
                {esBorrador && <Watermark />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCard && (
            <div className="mb-6 relative overflow-hidden rounded-2xl border border-[#FFD700]/25 bg-gradient-to-b from-[#0a0e27] to-[#101a3a] p-5">
              <SparkleField opacity={0.35} />
              <div className="relative">
                <CountdownTimer date={event.date} time={event.time} />
              </div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCard && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-6"
            >
              <EventInfo event={event} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCard && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mb-6"
            >
              <RSVPForm
                event={event}
                bloqueadoPorPago={esBorrador}
                onIrAPagar={esMio ? () => navigate(`/crear?status=pending&code=${encodeURIComponent(slug)}`) : undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCard && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="mb-6"
            >
              <ShareButtons event={event} />
              {/* Invitación impresa: el organizador puede bajarla en PDF o
                  imprimirla en A4 para entregar en mano. */}
              <button
                onClick={() => navigate(`/imprimir/${slug}`)}
                className="mt-3 w-full rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/[0.06] px-4 py-3 text-xs font-semibold text-[#FFD700]/90 hover:bg-[#FFD700]/10 transition-colors"
              >
                🖨 Versión impresa (PDF / A4)
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCard && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="pt-4 pb-8"
            >
              <div className="h-px w-full bg-white/10 mb-6" />
              <div className="text-center space-y-4">
                {/* CTA de referido: va en TODA invitación pública (paga o en
                    borrador), porque el invitado es el público más caliente. */}
                <ReferralCta />
                <p className="text-white/40 text-sm">
                  ¿Te gustó? Creá la tuya
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNavigateToCreate}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#ec4899] text-white font-bold text-base tracking-wide hover:opacity-90 transition-all shadow-lg shadow-[#FF6B35]/20"
                >
                  Volver y crear la mía →
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default InvitationPage;