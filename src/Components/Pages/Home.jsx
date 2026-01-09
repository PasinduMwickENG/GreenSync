import React, { useState, useEffect } from 'react';
import VideoPlayer from '../VideoPlayer';

function Home() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    { icon: 'fa-water', title: 'Automated Irrigation', desc: 'Smart soil moisture sensors trigger watering only when needed, reducing water usage by up to 40%.', gradient: 'from-blue-500 to-cyan-600' },
    { icon: 'fa-leaf', title: 'Plant Health Monitoring', desc: 'Computer vision analyzes plant leaves for early disease detection and nutrient deficiency alerts.', gradient: 'from-green-500 to-emerald-600' },
    { icon: 'fa-mobile-alt', title: 'Mobile Dashboard', desc: 'Real-time field data accessible anywhere with alerts and recommendations for optimal crop management.', gradient: 'from-purple-500 to-pink-600' },
    { icon: 'fa-cloud-sun', title: 'Weather Integration', desc: 'Automatic irrigation schedule adjustments based on local weather forecasts and frost warnings.', gradient: 'from-orange-500 to-red-600' },
    { icon: 'fa-chart-pie', title: 'Yield Prediction', desc: 'Advanced algorithms analyze growth patterns to predict harvest yields with remarkable accuracy.', gradient: 'from-indigo-500 to-blue-600' },
    { icon: 'fa-robot', title: 'Automation Control', desc: 'Remote control of greenhouses, irrigation systems, and farm equipment through unified platform.', gradient: 'from-teal-500 to-green-600' }
  ];

  const team = [
    { name: 'N.N.J. Gamage (E/20/111)', role: 'Backend Systems', image: '../../images/niduwara.jpg' },
    { name: 'Marlon Ekanayake', role: 'Hardware', image: '../../images/marlon.jpg' },
    { name: 'P.M.Wickramanayake', role: 'UX/UI, Frontend', image: '../../images/pasindu.jpg' }
  ];

  return (
    <div className="bg-white">
      <style>{`
        @keyframes blob { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 1s ease-out; }
      `}</style>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-green-200 rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-emerald-300 rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center justify-center mb-8">
              <div className="relative bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-3xl px-6 py-3">
                <span className="text-white font-semibold flex items-center gap-2">
                  <i className="fas fa-seedling"></i>Smart Agriculture Revolution
                </span>
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6">
              Revolutionizing Agriculture<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-100 to-emerald-200">with Automation</span>
            </h1>
            
            <p className="mt-6 max-w-3xl mx-auto text-xl md:text-2xl text-green-50">
              IoT-based automated system optimizing crop growth, reducing water waste, and increasing yields using smart sensors and AI.
            </p>
            
            <div className="mt-12 flex flex-wrap justify-center gap-4">
              <a href="#demo" className="group inline-flex items-center px-8 py-4 bg-white text-green-700 font-semibold rounded-2xl shadow-2xl hover:scale-105 transition-all">
                <i className="fas fa-play-circle mr-3 text-xl"></i>Watch Demo
              </a>
              <a href="#features" className="group inline-flex items-center px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-2xl border-2 border-white/30 hover:bg-white/20 transition-all">
                <i className="fas fa-info-circle mr-3"></i>Learn More<i className="fas fa-arrow-right ml-2"></i>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-bold text-sm uppercase tracking-wider">Features</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-4 mb-4">Smart Agriculture Features</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Comprehensive solutions for modern agricultural challenges</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-100">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                  <i className={`fas ${f.icon} text-2xl text-white`}></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{f.title}</h3>
                <p className="text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="py-24 bg-gradient-to-br from-green-600 to-emerald-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">System Demonstration</h2>
            <p className="text-xl text-green-100">See our system in action</p>
          </div>
          <VideoPlayer />
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {[
              { icon: 'fa-water', label: 'Water Savings', value: '60%', desc: 'reduction in usage' },
              { icon: 'fa-chart-line', label: 'Yield Increase', value: '20-30%', desc: 'crop yield boost' },
              { icon: 'fa-clock', label: 'Labor Reduction', value: '50-70%', desc: 'less manual work' }
            ].map((s, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 hover:scale-105 transition-all">
                <i className={`fas ${s.icon} text-5xl text-green-200 mb-4`}></i>
                <h3 className="text-3xl font-bold mb-2">{s.value}</h3>
                <p className="text-xl font-semibold mb-2">{s.label}</p>
                <p className="text-green-100">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-bold text-sm uppercase">Our Team</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-4">Meet the Team</h2>
          </div>

          <div className="flex flex-wrap justify-center gap-8 mb-16">
            {team.map((m, i) => (
              <div key={i} className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 max-w-sm">
                <div className="relative mb-6">
                  <div className="w-48 h-48 mx-auto rounded-3xl overflow-hidden shadow-xl ring-4 ring-green-100 group-hover:ring-green-300 transition-all">
                    <img src={m.image} alt={m.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 text-center mb-2">{m.name}</h3>
                <p className="text-green-600 font-semibold text-center text-sm mb-2">Dept. of Electronic & Electrical Engineering</p>
                <p className="text-gray-600 text-center mb-4">{m.role}</p>
                <div className="flex justify-center space-x-4">
                  {['linkedin', 'github', 'envelope'].map(ic => (
                    <a key={ic} href="#" className="w-10 h-10 rounded-full bg-gray-100 hover:bg-green-100 flex items-center justify-center transition-colors">
                      <i className={`fa${ic === 'envelope' ? 's' : 'b'} fa-${ic} text-gray-600 hover:text-green-600`}></i>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-center mb-8">Project Advisors</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100">
                <h4 className="text-xl font-bold mb-2">Prof. Lilantha Samaranayake</h4>
                <p className="text-green-600 font-semibold mb-1">Dean - Faculty of Engineering</p>
                <p className="text-gray-600">Main Supervisor</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100">
                <h4 className="text-xl font-bold mb-2">Prof. Janaka Ekanayake</h4>
                <p className="text-green-600 font-semibold">Dept. of Electronic & Electrical Engineering</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Get In Touch</h2>
            <p className="text-xl text-gray-600">Interested in our project? Contact us</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div className="bg-white rounded-3xl p-8 shadow-xl">
              <h3 className="text-2xl font-bold mb-6">Send a message</h3>
              <form className="space-y-6">
                {['name', 'email', 'subject'].map(f => (
                  <div key={f}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 capitalize">{f}</label>
                    <input type={f === 'email' ? 'email' : 'text'} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none" />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                  <textarea rows={4} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none resize-none"></textarea>
                </div>
                <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 rounded-xl hover:scale-105 transition-all shadow-lg">
                  Send Message
                </button>
              </form>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 shadow-xl">
                <h3 className="text-2xl font-bold mb-6">Project Info</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-university text-white"></i>
                    </div>
                    <div className="ml-4">
                      <p className="font-semibold">University of Peradeniya</p>
                      <p className="text-sm text-gray-600">Faculty of Engineering</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-envelope text-white"></i>
                    </div>
                    <div className="ml-4">
                      <p className="font-semibold">Email</p>
                      <p className="text-gray-600">greensync@gmail.com</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 shadow-xl text-white">
                <h3 className="text-2xl font-bold mb-6">GitHub</h3>
                <div className="flex items-center mb-6">
                  <i className="fab fa-github text-4xl mr-4"></i>
                  <div>
                    <p className="font-bold text-lg">GreenSync</p>
                    <p className="text-gray-400">Automated Agriculture</p>
                  </div>
                </div>
                <a href="#" className="inline-flex items-center justify-center w-full px-6 py-3 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100">
                  <i className="fab fa-github mr-2"></i>View on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mr-3">
              <i className="fas fa-leaf text-white"></i>
            </div>
            <h3 className="text-2xl font-bold">GreenSync</h3>
          </div>
          <p className="text-gray-400 mb-6">IoT-based automated agriculture system - University of Peradeniya</p>
          <div className="flex justify-center space-x-6 mb-6">
            {['twitter', 'linkedin', 'github', 'youtube'].map(s => (
              <a key={s} href="#" className="text-gray-400 hover:text-white transition-colors">
                <i className={`fab fa-${s} text-2xl`}></i>
              </a>
            ))}
          </div>
          <p className="text-gray-500 text-sm">© 2025 GreenSync - All rights reserved</p>
        </div>
      </footer>

      {/* Back to Top */}
      {showBackToTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-full shadow-2xl hover:scale-110 transition-transform z-50 flex items-center justify-center">
          <i className="fas fa-arrow-up"></i>
        </button>
      )}
    </div>
  );
}

export default Home;