import os
import glob

def add_pwa_to_html(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Determine relative path to root
    dirname = os.path.dirname(file_path)
    rel_root = os.path.relpath(root_dir, dirname)
    
    if rel_root == '.':
        prefix = './'
    else:
        prefix = rel_root + '/'

    # Inject manifest into HEAD
    manifest_link = f'<link rel="manifest" href="{prefix}manifest.json">'
    if 'rel="manifest"' not in content and '</head>' in content:
        content = content.replace('</head>', f'    {manifest_link}\n</head>')

    # Add iOS PWA visual fixes
    ios_meta = f'<meta name="apple-mobile-web-app-capable" content="yes">\n    <meta name="apple-mobile-web-app-status-bar-style" content="default">'
    if 'apple-mobile-web-app-capable' not in content and '</head>' in content:
        content = content.replace('</head>', f'    {ios_meta}\n</head>')

    # Inject Service Worker Registration into BODY
    sw_script = f"""
    <!-- PWA Service Worker Registration -->
    <script>
        if ('serviceWorker' in navigator) {{
            window.addEventListener('load', () => {{
                navigator.serviceWorker.register('{prefix}serviceWorker.js')
                    .then(reg => console.log('SW Registered', reg))
                    .catch(err => console.error('SW Registration failed', err));
            }});
        }}
    </script>
    """
    if 'navigator.serviceWorker.register' not in content and '</body>' in content:
        content = content.replace('</body>', f'{sw_script}\n</body>')

    with open(file_path, 'w') as f:
        f.write(content)

root_dir = '/Users/sudheer/Documents/ProjectWorkspace/loan_calculator'

html_files = glob.glob(f'{root_dir}/**/*.html', recursive=True)

for html_file in html_files:
    add_pwa_to_html(html_file)
    print(f"Injected PWA into: {html_file}")
