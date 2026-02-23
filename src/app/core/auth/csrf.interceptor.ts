import { HttpInterceptorFn } from '@angular/common/http';

function getCookie(name: string): string | null {
    const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[2]) : null;
}

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
    const withCredsReq = req.clone({ withCredentials: true });

    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        return next(withCredsReq);
    }

    const token = getCookie('csrf_token');
    if (!token) {
        return next(withCredsReq);
    }

    return next(
      withCredsReq.clone({
          setHeaders: { 'X-CSRF-Token': token },
      }),
    );
};

