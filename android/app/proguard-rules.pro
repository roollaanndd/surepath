# Keep Capacitor and WebView classes
-keep class com.getcapacitor.** { *; }
-keep class org.apache.cordova.** { *; }

# Keep AndroidX
-keep class androidx.** { *; }

# Keep model classes (prevents R8 from stripping interfaces used by reflection)
-keep class com.myinsurepath.os.** { *; }

# Keep JavaScript interface classes
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
