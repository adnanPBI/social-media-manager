import { FormEvent, useEffect, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { api } from '../lib/api';
import { ContentItem, MediaAsset } from '../types';

export function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [title, setTitle] = useState('9/10 Gas Pricing: A Massive Failure');
  const [body, setBody] = useState('Dozens of videos explain the history of 9/10-cent gas pricing, but almost none offer a practical path to remove it. Cancel910gas is building a movement to pressure big oil to drop the fraction for good.');
  const [hashtags, setHashtags] = useState('Cancel910gas, GasPricing, ConsumerAdvocacy');
  const [linkUrl, setLinkUrl] = useState('https://youtube.com/@cancel910gas');
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const response = await api.get('/content');
    setItems(response.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append('files', file));
      const response = await api.post('/media/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMedia((current) => [...current, ...response.data.files]);
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await api.post('/content', {
      title,
      body,
      hashtags: hashtags.split(',').map((h) => h.trim()).filter(Boolean),
      linkUrl,
      mediaAssets: media.map((m) => m.url),
    });
    setMedia([]);
    await load();
  }

  async function createApproved() {
    await api.post('/content/approved', {
      title,
      body,
      hashtags: hashtags.split(',').map((h) => h.trim()).filter(Boolean),
      linkUrl,
      mediaAssets: media.map((m) => m.url),
    });
    setMedia([]);
    await load();
  }

  async function action(id: string, route: string) {
    await api.post(`/content/${id}/${route}`);
    await load();
  }

  return (
    <div className="split">
      <form className="card form-card" onSubmit={submit}>
        <h2>Create CMS content</h2>
        <p>Draft here, or use “Create as approved” to simulate CMS-approved content arriving instantly.</p>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Body
          <textarea rows={7} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <label>
          Hashtags
          <input value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
        </label>
        <label>
          Link URL
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
        </label>
        <label className="upload-box">
          <UploadCloud size={20} /> {uploading ? 'Uploading...' : 'Upload image/video media'}
          <input type="file" multiple accept="image/*,video/mp4,video/quicktime" onChange={(e) => uploadFiles(e.target.files)} />
        </label>
        {media.length > 0 && (
          <div className="media-list">
            {media.map((file) => <span key={file.id}>{file.kind}: {file.filename}</span>)}
          </div>
        )}
        <div className="button-row">
          <button className="ghost" type="submit">Save draft</button>
          <button className="primary" type="button" onClick={createApproved}>Create as approved</button>
        </div>
      </form>

      <section className="card">
        <h2>Content queue</h2>
        <div className="content-list">
          {items.map((item) => (
            <article className="content-item" key={item.id}>
              <div className={`status-dot ${item.approvalStatus.toLowerCase()}`}>{item.approvalStatus}</div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <div className="tag-row">
                {(item.hashtags || []).map((tag) => <span key={tag}>#{tag.replace(/^#/, '')}</span>)}
              </div>
              <div className="button-row small-actions">
                {item.approvalStatus === 'DRAFT' && <button className="ghost" onClick={() => action(item.id, 'submit')}>Submit</button>}
                {item.approvalStatus !== 'APPROVED' && <button className="primary" onClick={() => action(item.id, 'approve')}>Approve</button>}
                {item.approvalStatus !== 'REJECTED' && <button className="ghost danger" onClick={() => action(item.id, 'reject')}>Reject</button>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
