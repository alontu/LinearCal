import React from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function TermsPage() {
    const today = new Date().toLocaleDateString('he-IL');

    return (
        <div className={styles.container} dir="rtl">
            <Link href="/" className={styles.backLink}>
                ← חזרה ללוח השנה
            </Link>

            <header className={styles.header}>
                <h1 className={styles.title}>תנאי שימוש ומדיניות פרטיות</h1>
                <p className={styles.lastUpdated}>עודכן לאחרונה: {today}</p>
            </header>

            <main>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>תנאי שימוש (Terms of Service)</h2>
                    <ul className={styles.list}>
                        <li className={styles.listItem}>
                            <strong>הגדרת השירות:</strong> האפליקציה ("לוח שנה ליניארי") מספקת כלי להצגה ויזואלית וניהול של יומן Google של המשתמש. השימוש באפליקציה כפוף לתנאים אלו.
                        </li>
                        <li className={styles.listItem}>
                            <strong>תלות בצד שלישי:</strong> השירות מסתמך באופן מלא על Google Calendar API. המפתחים אינם אחראים לשיבושים, אובדן מידע, שינויים בממשק, או כל בעיה אחרת הנובעת מהפלטפורמה המקורית של Google.
                        </li>
                        <li className={styles.listItem}>
                            <strong>אחריות המשתמש:</strong> השימוש באפליקציה הוא באחריות המשתמש בלבד. על המשתמש לדאוג לאבטחת חשבון ה-Google שלו ולאבטחת המכשיר ממנו הוא גולש.
                        </li>
                        <li className={styles.listItem}>
                            <strong>זמינות השירות:</strong> השירות מסופק במתכונת "כמות שהוא" (As Is). אנו עושים מאמץ לספק חוויית שימוש חלקה, אך אין התחייבות לזמינות של 100% או להיעדר באגים.
                        </li>
                        <li className={styles.listItem}>
                            <strong>קניין רוחני:</strong> כל הזכויות על הקוד, העיצוב, הממשק והרעיון של האפליקציה שמורות למפתחים. אין להעתיק או לעשות שימוש מסחרי ללא אישור.
                        </li>
                        <li className={styles.listItem}>
                            <strong>שינויים בתנאים:</strong> המפתחים רשאים לשנות את תנאי השימוש מעת לעת. המשך השימוש באפליקציה מהווה הסכמה לתנאים המעודכנים.
                        </li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>מדיניות פרטיות (Privacy Policy)</h2>
                    <ul className={styles.list}>
                        <li className={styles.listItem}>
                            <strong>איסוף מידע:</strong> האפליקציה מבקשת הרשאת גישה לחשבון Google שלך (באמצעות פרוטוקול OAuth המאובטח) אך ורק לצורך קריאה וכתיבה של אירועי יומן, כפי שנדרש לפעולת האפליקציה התקינה. בנוסף, אנו עשויים לקבל את כתובת האימייל והשם שלך לצורך זיהוי.
                        </li>
                        <li className={styles.listItem}>
                            <strong>שימוש במידע:</strong> המידע שמתקבל משמש אך ורק להצגת האירועים בלוח השנה הליניארי ולביצוע פעולות (כגון הוספה או עריכה של אירועים) לבקשתך.
                        </li>
                        <li className={styles.listItem}>
                            <strong>שמירת מידע:</strong> האפליקציה <strong>אינה</strong> שומרת את תוכן האירועים שלכם בשרתים שלה באופן קבוע. הנתונים נמשכים ישירות מ-Google בעת השימוש. ייתכן שימוש בזיכרון מטמון (Caching) זמני בדפדפן או בשרת לצורך שיפור הביצועים בלבד.
                        </li>
                        <li className={styles.listItem}>
                            <strong>שיתוף מידע:</strong> המידע האישי והאירועים שלך אינם מועברים לאף צד שלישי, למעט Google עצמה (לצורך הפעילות הטכנית). איננו מוכרים, משכירים או מעבירים מידע למפרסמים או גורמים אחרים.
                        </li>
                        <li className={styles.listItem}>
                            <strong>עוגיות (Cookies):</strong> האפליקציה עושה שימוש בקבצי "עוגיות" (Cookies) לצורך תפעול תקין (כמו שמירת חיבור המשתמש - Session).
                        </li>
                        <li className={styles.listItem}>
                            <strong>אבטחת מידע:</strong> כל התקשורת בין האפליקציה לשרתי Google מתבצעת בפרוטוקול מוצפן ומאובטח.
                        </li>
                        <li className={styles.listItem}>
                            <strong>זכויות המשתמש:</strong> באפשרותך לבטל את ההרשאה שנתת לאפליקציה בכל עת דרך עמוד <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-accent)' }}>הגדרות האבטחה של חשבון Google</a> שלך.
                        </li>
                    </ul>
                </section>
            </main>
        </div>
    );
}
