// src/app/utils/ckeditor-s3-adapter.ts

type SignRes = { uploadUrl: string; publicUrl: string; key: string };

function sanitizeFilename(name: string) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const base = name.replace(/\.[^/.]+$/, '');
  const safeBase = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return ext ? `${safeBase}.${ext}` : safeBase;
}

export class S3UploadAdapter {
  private xhr?: XMLHttpRequest;
  private aborted = false;

  constructor(private loader: any) {}

  async upload() {
    const file: File = await this.loader.file;

    // 0) sanity
    if (!file) throw new Error('No file provided');
    const contentType = file.type || 'application/octet-stream';
    const filename = sanitizeFilename(file.name || 'upload');

    // 1) pedir URL firmada
    const signRes = await fetch('http://localhost:3000/aaron/maslatino/sign-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        contentType,
        approxSize: file.size,
      }),
    });
    if (!signRes.ok) throw new Error('No se pudo firmar');

    const { uploadUrl, publicUrl } = (await signRes.json()) as SignRes;
    if (!uploadUrl || !publicUrl) {
      throw new Error('Firma inválida: falta uploadUrl/publicUrl');
    }

    // 2) PUT directo a S3 con progreso (XHR para reportar progreso a CKEditor)
    await this.putWithProgress(uploadUrl, file, contentType);

    // 3) Entregar URL pública al editor (añade cache-buster para evitar ver ícono por cache 403/latencia)
    const cacheBuster = `_=${Date.now()}`;
    const viewUrl = publicUrl.includes('?') ? `${publicUrl}&${cacheBuster}` : `${publicUrl}?${cacheBuster}`;

    // (opcional) micro-retardo para darle tiempo a la consistencia de S3/CF
    await new Promise(r => setTimeout(r, 60));

    return { default: viewUrl };
  }

  abort() {
    this.aborted = true;
    if (this.xhr && this.xhr.readyState !== XMLHttpRequest.DONE) {
      this.xhr.abort();
    }
  }

  // --- Helpers ---
  private putWithProgress(url: string, file: File, contentType: string) {
    this.xhr = new XMLHttpRequest();

    return new Promise<void>((resolve, reject) => {
      const xhr = this.xhr!;
      xhr.open('PUT', url, true);
      xhr.withCredentials = false;
      xhr.setRequestHeader('Content-Type', contentType);

      // progreso para CKEditor
      xhr.upload.onprogress = (evt: ProgressEvent<EventTarget>) => {
        if (evt.lengthComputable) {
          this.loader.uploadTotal = evt.total;
          this.loader.uploaded = evt.loaded;
        }
      };

      xhr.onerror = () => reject(new Error('Fallo PUT a S3'));
      xhr.onabort = () => reject(new Error('Subida cancelada'));
      xhr.onload = () => {
        // S3 puede responder 200 o 204
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`PUT a S3 falló con código ${xhr.status}`));
        }
      };

      try {
        xhr.send(file);
      } catch (e) {
        reject(e);
      }
    });
  }
}

export function S3UploadAdapterPlugin(editor: any) {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) =>
    new S3UploadAdapter(loader);
}
