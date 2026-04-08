export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 relative overflow-hidden">
            {/* Patrón de fondo sutil (puntos o malla) */}
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px]" />

            <div className="relative z-10 w-full max-w-md px-4 py-8">
                {children}
            </div>
        </div>
    );
}
