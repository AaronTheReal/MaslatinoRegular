// src/app/utils/ckeditor-s3-adapter.ts
type SignRes = { uploadUrl: string; publicUrl: string; key: string };

export class S3UploadAdapter {
  constructor(private loader: any) {}

  async upload() {
    const file: File = await this.loader.file;

    // 1) Pedir URL firmada
    const sign = await fetch('/sign-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        approxSize: file.size
      })
    });
    if (!sign.ok) throw new Error('No se pudo firmar');
    const { uploadUrl, publicUrl } = (await sign.json()) as SignRes;

    // 2) PUT directo a S3
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    });
    if (!put.ok) throw new Error('Fallo PUT a S3');

    // 3) Entregar URL pública al editor
    return { default: publicUrl };
  }

  abort() {}
}

export function S3UploadAdapterPlugin(editor: any) {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) =>
    new S3UploadAdapter(loader);
}
