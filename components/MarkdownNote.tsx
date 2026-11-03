import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import {safeLink} from '@/lib/model';

export default function MarkdownNote({text}:{text:string}) {
  return <div className="markdown-note"><Markdown
    remarkPlugins={[remarkGfm,remarkBreaks]}
    allowedElements={['p','br','strong','em','del','ul','ol','li','a','blockquote','code','pre']}
    unwrapDisallowed
    skipHtml
    urlTransform={url=>safeLink(url)??''}
    components={{a:({href,children})=>{
      if(!href)return <span>{children}</span>;
      const label=typeof children==='string'&&/^https?:\/\//i.test(children)?new URL(href).hostname:children;
      return <a href={href} target="_blank" rel="noopener noreferrer">{label} ↗</a>;
    }}}
  >{text}</Markdown></div>;
}
