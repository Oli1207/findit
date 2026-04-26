# backend/scripts/truncate_presentations.py

from store.models import Presentation

def run():
    total = 0
    for p in Presentation.objects.all():
        changed = False

        if p.title and len(p.title) > 50:
            p.title = p.title[:50]
            changed = True

        if p.description and len(p.description) > 50:
            p.description = p.description[:50]
            changed = True

        if changed:
            p.save()
            total += 1

    print(f"Nettoyage terminé ✔️ ({total} présentations modifiées)")
