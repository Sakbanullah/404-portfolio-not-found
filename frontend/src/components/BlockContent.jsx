import { fileUrl } from '../api.js';
import { fontStack, safeUrl } from '../lib/blocks.js';

// Tampilan isi satu blok. Dipakai oleh editor (interactive=false) dan halaman publik (interactive=true).
// Semua teks dirender lewat React sehingga otomatis di-escape; link disaring oleh safeUrl.
export default function BlockContent({ block, assetsById, interactive = false }) {
  const p = block.props;

  switch (block.type) {
    case 'text':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            color: p.color,
            fontSize: p.fontSize,
            fontFamily: fontStack(p.fontFamily),
            fontWeight: p.fontWeight,
            textAlign: p.align,
            lineHeight: p.lineHeight,
            letterSpacing: `${p.letterSpacing}px`,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
          }}
        >
          {p.content}
        </div>
      );

    case 'image': {
      const asset = assetsById[p.assetId];
      if (!asset) return <div className="img-missing">Pilih gambar</div>;
      return (
        <img
          src={fileUrl(asset.url)}
          alt={asset.name}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: p.fit,
            borderRadius: p.radius,
            display: 'block',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      );
    }

    case 'shape': {
      const background = p.fill2 ? `linear-gradient(${p.angle}deg, ${p.fill}, ${p.fill2})` : p.fill;
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            background,
            borderRadius: p.shape === 'circle' ? '50%' : p.radius,
            border: p.borderWidth ? `${p.borderWidth}px solid ${p.borderColor}` : 'none',
            filter: p.blur ? `blur(${p.blur}px)` : 'none',
          }}
        />
      );
    }

    case 'project': {
      const href = interactive ? safeUrl(p.url) : null;
      return (
        <div className="pcard" style={{ background: p.bg, color: p.textColor, borderColor: `${p.accent}55` }}>
          <span className="pcard-bar" style={{ background: p.accent }} />
          <h3>{p.title}</h3>
          <p>{p.description}</p>
          <div className="pcard-tags">
            {(p.tags || []).map((tag, i) => (
              <span key={i} style={{ color: p.accent, borderColor: `${p.accent}66` }}>
                {tag}
              </span>
            ))}
          </div>
          {p.url &&
            (href ? (
              <a className="pcard-link" href={href} target="_blank" rel="noopener noreferrer" style={{ color: p.accent }}>
                Lihat proyek →
              </a>
            ) : (
              <span className="pcard-link" style={{ color: p.accent }}>
                Lihat proyek →
              </span>
            ))}
        </div>
      );
    }

    case 'button': {
      const href = interactive ? safeUrl(p.url) : null;
      const style = {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: p.bg,
        color: p.color,
        borderRadius: p.radius,
        fontSize: p.fontSize,
        fontWeight: 600,
        fontFamily: fontStack('Inter'),
        textDecoration: 'none',
        textAlign: 'center',
        padding: '0 12px',
      };
      if (href) {
        const external = !href.startsWith('mailto:');
        return (
          <a href={href} style={style} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {p.label}
          </a>
        );
      }
      return <div style={style}>{p.label}</div>;
    }

    case 'terminal':
      return (
        <div className="term" style={{ fontSize: p.fontSize, '--term-accent': p.accent }}>
          <div className="term-bar">
            <i />
            <i />
            <i />
            <span>{p.title}</span>
          </div>
          <pre>
            {String(p.lines)
              .split('\n')
              .map((line, i) => (
                <div key={i} className={line.startsWith('$') ? 'term-cmd' : undefined}>
                  {line || ' '}
                </div>
              ))}
          </pre>
        </div>
      );

    default:
      return null;
  }
}
