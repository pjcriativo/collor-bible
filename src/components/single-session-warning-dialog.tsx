import { useEffect, useState } from "react";
import { AlertTriangle, Smartphone } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Diálogo mostrado quando detectamos que OUTRO dispositivo entrou na conta.
 * Em vez de deslogar imediatamente, damos ao usuário uma janela de graça
 * (countdown) para escolher entre:
 *  - "Manter esta sessão": reivindica o token de volta neste dispositivo
 *    (o outro será deslogado).
 *  - "Sair agora": encerra esta sessão imediatamente.
 *
 * Se o tempo expirar sem ação, força o logout normal.
 */
export type SingleSessionWarningDialogProps = {
  open: boolean;
  /** Segundos restantes até o logout automático. */
  secondsLeft: number;
  /** Resumo amigável do dispositivo que entrou (ex.: "iPhone · Safari"). */
  otherDeviceLabel: string | null;
  onKeepThisDevice: () => void;
  onLogoutNow: () => void;
};

export function SingleSessionWarningDialog({
  open,
  secondsLeft,
  otherDeviceLabel,
  onKeepThisDevice,
  onLogoutNow,
}: SingleSessionWarningDialogProps) {
  // Mantém visível enquanto o consumidor mantiver `open` em true; o conteúdo
  // não é desmontado entre updates do countdown porque só re-renderiza props.
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="border-destructive/30 bg-surface/95 backdrop-blur">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <AlertDialogTitle className="text-center font-display text-xl">
            Outro dispositivo entrou na sua conta
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm leading-relaxed">
            Por segurança, só pode ficar uma sessão ativa por vez. Você tem{" "}
            <span className="font-bold text-foreground">{secondsLeft}s</span> para escolher o que
            fazer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {otherDeviceLabel && (
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-background/40 p-3 ring-1 ring-inset ring-white/[0.06]">
            <Smartphone className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Novo acesso
              </p>
              <p className="truncate text-sm text-foreground">{otherDeviceLabel}</p>
            </div>
          </div>
        )}

        {/* Barra de progresso visual do tempo restante */}
        <CountdownBar secondsLeft={secondsLeft} />

        <AlertDialogFooter className="mt-2 flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={onKeepThisDevice}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Manter esta sessão
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={onLogoutNow}
            className="mt-0 w-full bg-transparent text-muted-foreground hover:bg-background/40 hover:text-foreground"
          >
            Sair agora
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Barra de progresso animada do countdown. Mantida como subcomponente para
 * isolar a animação CSS e não re-renderizar o resto do diálogo a cada tick.
 */
function CountdownBar({ secondsLeft }: { secondsLeft: number }) {
  // Captura o total na primeira renderização para calcular a porcentagem.
  const [total, setTotal] = useState(secondsLeft);
  useEffect(() => {
    if (secondsLeft > total) setTotal(secondsLeft);
  }, [secondsLeft, total]);
  const pct = total > 0 ? Math.max(0, Math.min(100, (secondsLeft / total) * 100)) : 0;
  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-background/40">
      <div
        className="h-full bg-destructive transition-[width] duration-1000 ease-linear"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
