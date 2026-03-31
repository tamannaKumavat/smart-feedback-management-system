import WebLogo from "../components/WebLogo.jsx";

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="flex w-full max-w-auth-card flex-col">
        <div className="mb-6 w-full flex items-center justify-center">
          <WebLogo className="h-10 w-auto sm:h-12" />
        </div>
        <h1 className="text-center text-heading6 font-bold text-content sm:text-heading5_b">
          {title}
        </h1>
        {subtitle ? (
          <p className="mb-8 mt-2 text-center text-captionlarge font-normal text-content-muted sm:text-bodysmall">
            {subtitle}
          </p>
        ) : (
          <div className="mb-8" />
        )}
        <div className="auth-card">{children}</div>
      </div>
    </div>
  );
}
