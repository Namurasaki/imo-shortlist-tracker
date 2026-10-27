import os
import re
import json

def parse_tex_to_json(input_path, output_paths):
    with open(input_path, 'r', encoding='latin1') as f:
        text = f.read()

    lines = text.split('\n')

    # Extract Booklet Links and AoPS Collection Links
    booklets = {}
    aops_collections = {}
    for line in lines[:236]:
        m_booklet = re.search(r'\\href\{([^}]+)\}\{\\text\{(\d{4})\s+IMO Shortlist Booklet\}\}', line)
        if m_booklet:
            booklets[int(m_booklet.group(2))] = m_booklet.group(1)
        m_aops = re.search(r'\\href\{([^}]+)\}\{\\text\{(\d{4})\s+IMO Shortlist AoPS Collection\}\}', line)
        if m_aops:
            aops_collections[int(m_aops.group(2))] = m_aops.group(1)

    # Locate where the actual problem list starts
    start_idx = 0
    for i, line in enumerate(lines):
        if r'\title{Algebra IMO Shortlist Problems}' in line:
            start_idx = i
            break

    item_pattern = re.compile(
        r'\\item\s*'
        r'(?P<boxed>\\boxed\{)?'
        r'(?P<dbox>\\dbox\{)?'
        r'\s*(?:\\href\{(?P<url>[^}]+)\})?'
        r'\s*\{*(?:\\textbf\{(?P<year>\d{4})\s+(?P<pos_code>(?P<genre_code>[ACGN])(?P<pos_num>\d+))\s*\})',
        re.IGNORECASE
    )

    problem_starts = []
    current_genre = 'Algebra'

    for idx in range(start_idx, len(lines)):
        line = lines[idx]
        if r'\title{Algebra' in line:
            current_genre = 'Algebra'
        elif r'\title{Combinatorics' in line:
            current_genre = 'Combinatorics'
        elif r'\title{Geometry' in line:
            current_genre = 'Geometry'
        elif r'\title{Number Theory' in line:
            current_genre = 'Number Theory'

        m = item_pattern.search(line)
        if m:
            problem_starts.append({
                'line_idx': idx,
                'match': m,
                'genre': current_genre
            })

    problems = []

    for i in range(len(problem_starts)):
        curr = problem_starts[i]
        curr_line_idx = curr['line_idx']
        m = curr['match']
        genre = curr['genre']
        year = int(m.group('year'))
        genre_code = m.group('genre_code').upper()
        pos_num = int(m.group('pos_num'))
        pos_code = f"{genre_code}{pos_num}"
        code = f"{year} {pos_code}"
        problem_id = f"{year}-{pos_code}"
        url = m.group('url') or ''
        is_imo = bool(m.group('boxed'))
        is_scrapped = bool(m.group('dbox'))

        if i + 1 < len(problem_starts):
            next_line_idx = problem_starts[i + 1]['line_idx']
        else:
            next_line_idx = len(lines)

        raw_statement_lines = lines[curr_line_idx:next_line_idx]

        first_line = raw_statement_lines[0]
        end_pos = m.end()
        rem_first_line = first_line[end_pos:]
        # Strip any closing braces and whitespace from \boxed / \dbox / \href
        rem_first_line = re.sub(r'^[\s\}]+', '', rem_first_line)

        statement_lines = [rem_first_line] + raw_statement_lines[1:]

        cleaned_lines = []
        itemize_depth = 0
        for l in statement_lines:
            stripped = l.strip()
            if (
                stripped.startswith(r'\section*')
                or stripped.startswith(r'\title{')
                or stripped.startswith(r'\end{document}')
            ):
                break
            if stripped == r'\newpage':
                continue
            if r'\begin{itemize}' in stripped:
                itemize_depth += 1
            if stripped == r'\end{itemize}':
                if itemize_depth > 0:
                    itemize_depth -= 1
                    cleaned_lines.append(l)
                else:
                    # This is the outer section's \end{itemize}, skip it
                    continue
            else:
                cleaned_lines.append(l)

        statement = '\n'.join(cleaned_lines).strip()
        is_revealed = (statement != "TO BE REVEALED!")

        problems.append({
            'id': problem_id,
            'code': code,
            'year': year,
            'genre': genre,
            'genre_code': genre_code,
            'position': pos_num,
            'pos_code': pos_code,
            'is_imo': is_imo,
            'is_scrapped': is_scrapped,
            'url': url,
            'booklet_url': booklets.get(year, ''),
            'aops_collection_url': aops_collections.get(year, ''),
            'statement': statement,
            'is_revealed': is_revealed
        })

    for out_path in output_paths:
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(problems, f, indent=2, ensure_ascii=False)
        print(f"Saved {len(problems)} problems to {out_path}")

    return problems

if __name__ == '__main__':
    parse_tex_to_json(
        '/home/nam/OneDrive/Documents/my_files/Maths/ISL/Big Beautiful Shortlist v2.1.tex',
        [
            '/home/nam/OneDrive/Documents/my_files/Maths/ISL/app/src/data/problems.json'
        ]
    )
