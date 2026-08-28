#!/usr/bin/env python3
"""App Store の情報を取得して assets/data.json を更新する。

手書きした説明文・タグ・リポジトリ情報は保持したまま、
評価・レビュー数・公開日などの数値と、新しく公開されたアプリだけを取り込む。

    python3 tools/update-data.py

新しいアプリが見つかった場合は説明文とタグが空の状態で追加されるので、
実行後のメッセージに従って assets/data.json を手で埋めること。
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

DEVELOPER_ID = 1616494891  # Masamichi Nakada
LOOKUP_URL = (
    f"https://itunes.apple.com/lookup?id={DEVELOPER_ID}"
    "&entity=software&country=jp&limit=200"
)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(ROOT, "assets", "data.json")
ICON_DIR = os.path.join(ROOT, "assets", "icons")

CATEGORY = {
    "Games": "ゲーム",
    "Business": "ツール",
    "Productivity": "ツール",
    "Shopping": "ツール",
    "Lifestyle": "ツール",
    "Education": "実験・学習",
    "Photo & Video": "実験・学習",
}


def short_title(name):
    """「アプリ名 - 説明」形式から先頭のアプリ名だけを取り出す。"""
    return re.split(r"\s*[:：\-—]\s*", name)[0].strip()


def fetch_apps():
    try:
        with urllib.request.urlopen(LOOKUP_URL, timeout=30) as res:
            payload = json.load(res)
    except (urllib.error.URLError, json.JSONDecodeError) as e:
        sys.exit(f"App Store の情報を取得できませんでした: {e}")

    apps = [r for r in payload.get("results", []) if r.get("wrapperType") == "software"]
    if not apps:
        sys.exit("アプリが1本も取得できませんでした。中止します。")
    return apps


def icon_filename(entry, app):
    """既存エントリのアイコン名を引き継ぐ。新規なら bundleId から作る。"""
    if entry and entry.get("icon"):
        return os.path.basename(entry["icon"])
    url = app.get("artworkUrl512") or app.get("artworkUrl100") or ""
    ext = ".png" if url.endswith(".png") else ".jpg"
    return app["bundleId"].rsplit(".", 1)[-1] + ext


def ensure_icon(app, filename):
    path = os.path.join(ICON_DIR, filename)
    if os.path.exists(path):
        return
    url = app.get("artworkUrl512") or app.get("artworkUrl100")
    if not url:
        print(f"  ! アイコン URL が取得できません: {app['trackName']}")
        return
    os.makedirs(ICON_DIR, exist_ok=True)
    urllib.request.urlretrieve(url, path)
    print(f"  + アイコンを保存: {filename}")


def platforms_of(app):
    if app.get("kind") == "mac-software":
        return ["macOS"]
    devices = app.get("supportedDevices") or []
    return ["iOS", "Mac"] if any("Mac" in d for d in devices) else ["iOS"]


def main():
    with open(DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)

    # 既存エントリを trackId と bundleId の両方で引けるようにする
    by_id = {}
    for entry in data["apps"]:
        by_id[entry["id"]] = entry
        if entry.get("bundleId"):
            by_id[entry["bundleId"]] = entry

    apps = fetch_apps()
    print(f"App Store から {len(apps)} 本を取得しました。\n")

    updated, new_apps, changes = [], [], []

    for app in apps:
        entry = by_id.get(app["trackId"]) or by_id.get(app["bundleId"])
        name = short_title(app["trackName"])
        rating = round(app.get("averageUserRating") or 0, 2)
        count = app.get("userRatingCount") or 0

        if entry:
            if entry["ratingCount"] != count:
                changes.append(f"  {name}: レビュー {entry['ratingCount']} → {count} 件")
            if entry["rating"] != rating:
                changes.append(f"  {name}: 評価 ★{entry['rating']} → ★{rating}")
        else:
            new_apps.append(name)

        filename = icon_filename(entry, app)
        ensure_icon(app, filename)

        updated.append({
            "id": app["trackId"],
            "bundleId": app["bundleId"],
            "name": name,
            "fullName": app["trackName"],
            # 手書きの内容はそのまま引き継ぐ
            "desc": entry["desc"] if entry else "",
            "tags": entry["tags"] if entry else [],
            "icon": f"assets/icons/{filename}",
            "url": f"https://apps.apple.com/jp/app/id{app['trackId']}",
            "repo": entry.get("repo") if entry else None,
            "repoPublic": entry.get("repoPublic", False) if entry else False,
            "category": CATEGORY.get(app.get("primaryGenreName"), "ツール"),
            "platforms": platforms_of(app),
            "price": app.get("formattedPrice"),
            "released": app["releaseDate"][:7],
            "updated": (app.get("currentVersionReleaseDate") or "")[:10],
            "rating": rating,
            "ratingCount": count,
        })

    # App Store から消えたアプリはリンクが 404 になるため除外する
    live_ids = {a["trackId"] for a in apps}
    removed = [e["name"] for e in data["apps"] if e["id"] not in live_ids]

    updated.sort(key=lambda a: a["released"], reverse=True)
    data["apps"] = updated

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    if changes:
        print("数値の変化:")
        print("\n".join(changes) + "\n")
    if removed:
        print("!! App Store で見つからなくなったため削除しました:")
        for n in removed:
            print(f"  - {n}")
        print("   （復元したい場合は git diff を確認してください）\n")
    if new_apps:
        print("!! 新しいアプリを追加しました。説明文とタグが空です:")
        for n in new_apps:
            print(f"  + {n}")
        print("   assets/data.json の desc と tags を埋めてください。\n")
    if not (changes or removed or new_apps):
        print("変化はありませんでした。\n")

    total = sum(a["ratingCount"] for a in updated)
    avg = sum(a["rating"] * a["ratingCount"] for a in updated) / total if total else 0
    print(f"完了: {len(updated)} 本 / 累計レビュー {total} 件 / 平均 ★{avg:.2f}")


if __name__ == "__main__":
    main()
